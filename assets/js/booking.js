/**
 * Live appointment booking widget.
 *
 * Talks to the Cloudflare Worker in /worker (see worker/README.md to deploy
 * it). Until BOOKING_API is set below, this does nothing and the existing
 * plain Formspree form on appointment.html stays as the booking method —
 * so nothing breaks if the backend isn't live yet.
 */
(function () {
  const BOOKING_API = ""; // e.g. "https://family-dental-booking.<subdomain>.workers.dev"

  const DOCTORS = [
    { key: "doshi", name: "Dr. Jay Doshi" },
    { key: "pham", name: "Dr. Brandon Pham" },
    { key: "nguyen", name: "Dr. Mai Nguyen" },
    { key: "khadija", name: "Dr. Duha Abou Khadija" },
  ];

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    }
    for (const child of children || []) node.appendChild(child);
    return node;
  }

  function todayStr() {
    const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // IST
    return d.toISOString().slice(0, 10);
  }

  function fmt12h(t) {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }

  async function initBookingWidget(container) {
    container.innerHTML = "";
    container.classList.add("booking-widget");

    let state = { kind: "appointment", doctor: DOCTORS[0].key, date: todayStr(), time: null };

    const doctorSelect = el("select", { name: "bw-doctor" },
      DOCTORS.map((d) => el("option", { value: d.key, text: d.name }))
    );
    const kindSelect = el("select", { name: "bw-kind" }, [
      el("option", { value: "appointment", text: "Appointment" }),
      el("option", { value: "lab", text: "Lab / Other Service" }),
    ]);
    const dateInput = el("input", { type: "date", name: "bw-date", min: todayStr(), value: todayStr() });
    const langSelect = el("select", { name: "bw-lang" }, [
      el("option", { value: "en", text: "Email language: English" }),
      el("option", { value: "hi", text: "ईमेल भाषा: हिन्दी" }),
    ]);

    const slotsWrap = el("div", { class: "slot-grid", "aria-live": "polite" });
    const status = el("p", { class: "form-status", role: "status" });
    const patientWrap = el("div", { class: "booking-patient-fields", hidden: "hidden" });

    const nameInput = el("input", { type: "text", placeholder: "Full name", required: "required" });
    const phoneInput = el("input", { type: "tel", placeholder: "(000) 000-0000", required: "required" });
    const emailInput = el("input", { type: "email", placeholder: "youremailaddress@email.com", required: "required" });
    const reasonInput = el("input", { type: "text", placeholder: "Reason for visit (optional)" });
    const patientDobInput = el("input", { type: "date", "aria-label": "Patient date of birth" });

    const insuranceNameInput = el("input", { type: "text", placeholder: "Name of Insurance" });
    const insuranceMemberIdInput = el("input", { type: "text", placeholder: "Member ID" });
    const insuranceGroupInput = el("input", { type: "text", placeholder: "Group #" });
    const insurancePhoneInput = el("input", { type: "tel", placeholder: "Phone number for insurance" });
    const subscriberNameInput = el("input", { type: "text", placeholder: "Main subscriber name (if different from patient)" });
    const subscriberDobInput = el("input", { type: "date", "aria-label": "Main subscriber date of birth" });

    const confirmBtn = el("button", { type: "button", class: "btn btn-primary" }, [document.createTextNode("Confirm Booking")]);

    patientWrap.append(
      el("h3", { text: "Your Details" }),
      nameInput, phoneInput, emailInput, reasonInput, patientDobInput,
      el("h3", { text: "Insurance Information (leave blank if self-pay)" }),
      insuranceNameInput, insuranceMemberIdInput, insuranceGroupInput, insurancePhoneInput,
      subscriberNameInput, subscriberDobInput,
      confirmBtn
    );

    async function loadSlots() {
      slotsWrap.innerHTML = "Loading available times…";
      patientWrap.hidden = true;
      state.time = null;
      try {
        const url = `${BOOKING_API}/slots?kind=${encodeURIComponent(state.kind)}&doctor=${encodeURIComponent(state.doctor)}&date=${encodeURIComponent(state.date)}`;
        const res = await fetch(url);
        const data = await res.json();
        renderSlots(data.slots || []);
      } catch (err) {
        slotsWrap.innerHTML = "";
        slotsWrap.appendChild(el("p", { text: "Couldn't load available times. Please try again or call us directly." }));
      }
    }

    function renderSlots(slots) {
      slotsWrap.innerHTML = "";
      if (slots.length === 0) {
        slotsWrap.appendChild(el("p", { text: "No times available that day — try another date." }));
        return;
      }
      slots.forEach((t) => {
        const btn = el("button", { type: "button", class: "slot-btn" }, [document.createTextNode(fmt12h(t))]);
        btn.addEventListener("click", () => {
          state.time = t;
          [...slotsWrap.children].forEach((b) => b.classList.remove("is-selected"));
          btn.classList.add("is-selected");
          patientWrap.hidden = false;
        });
        slotsWrap.appendChild(btn);
      });
    }

    kindSelect.addEventListener("change", () => { state.kind = kindSelect.value; loadSlots(); });
    doctorSelect.addEventListener("change", () => { state.doctor = doctorSelect.value; loadSlots(); });
    dateInput.addEventListener("change", () => { state.date = dateInput.value; loadSlots(); });

    confirmBtn.addEventListener("click", async () => {
      status.textContent = "";
      if (!state.time) return;
      if (!nameInput.value || !phoneInput.value || !emailInput.value) {
        status.textContent = "Please fill in your name, phone, and email.";
        return;
      }
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Booking…";
      try {
        const res = await fetch(`${BOOKING_API}/book`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: state.kind,
            doctor: state.doctor,
            date: state.date,
            time: state.time,
            name: nameInput.value,
            phone: phoneInput.value,
            email: emailInput.value,
            language: langSelect.value,
            details: {
              reason: reasonInput.value,
              patientDob: patientDobInput.value,
              insuranceName: insuranceNameInput.value,
              insuranceMemberId: insuranceMemberIdInput.value,
              insuranceGroupNumber: insuranceGroupInput.value,
              insurancePhone: insurancePhoneInput.value,
              subscriberName: subscriberNameInput.value,
              subscriberDob: subscriberDobInput.value,
            },
          }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          container.innerHTML = "";
          container.appendChild(el("div", { class: "booking-success" }, [
            el("h3", { text: "You're booked!" }),
            el("p", { text: `Reference: ${data.reference}. A confirmation email is on its way — it includes a link if you need to cancel.` }),
          ]));
        } else if (data.error === "slot_taken" || data.error === "too_soon") {
          status.textContent = "Sorry, that time was just taken — pick another below.";
          renderSlots(data.slots || []);
          patientWrap.hidden = true;
        } else {
          status.textContent = "Something went wrong. Please try again or call us directly.";
        }
      } catch (err) {
        status.textContent = "Something went wrong. Please try again or call us directly.";
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm Booking";
      }
    });

    container.append(
      el("h3", { text: "Pick a Doctor, Date, and Time" }),
      el("div", { class: "field-row" }, [
        el("label", {}, [el("span", { text: "Doctor" }), doctorSelect]),
        el("label", {}, [el("span", { text: "Visit Type" }), kindSelect]),
      ]),
      el("div", { class: "field-row" }, [
        el("label", {}, [el("span", { text: "Date" }), dateInput]),
        el("label", {}, [el("span", { text: "Email Language" }), langSelect]),
      ]),
      slotsWrap,
      patientWrap,
      status
    );

    loadSlots();
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!BOOKING_API) return; // backend not deployed yet — keep the Formspree form
    const container = document.getElementById("booking-widget");
    const fallbackForm = document.querySelector(".appt-form");
    if (!container) return;
    if (fallbackForm) fallbackForm.hidden = true;
    container.hidden = false;
    initBookingWidget(container);
  });
})();
