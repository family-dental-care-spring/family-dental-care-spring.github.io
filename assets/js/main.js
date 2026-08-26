/**
 * Family Dental Care of Spring — site behavior.
 * Loaded on every page via <script src="assets/js/main.js" defer>.
 * Each module below no-ops safely on pages that don't contain its markup,
 * so this single file can be shared across index.html, staff.html, etc.
 */
'use strict';

const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Hero slider (home page only): rotates headline/subhead text on an interval
 * and via prev/next/dot controls. No-ops if the slider markup isn't present.
 */
const HeroSlider = (() => {
  const SLIDES = [
    { eyebrow: 'Spring, TX · Family Dentistry', title: 'Care for Your Smile', sub: 'and Let it Brighten Your Day!' },
    { eyebrow: 'Spring, TX · Family Dentistry', title: 'Healthy Mouth', sub: 'Happy Life' },
    { eyebrow: 'Spring, TX · Family Dentistry', title: 'Changing Lives', sub: 'One Smile at a Time' },
    { eyebrow: 'Spring, TX · Family Dentistry', title: 'Discover Your Smile', sub: 'Today!' },
  ];
  const TRANSITION_MS = 180;
  const AUTOPLAY_MS = 6000;

  const els = {
    title: document.getElementById('slideTitle'),
    sub: document.getElementById('slideSub'),
    eyebrow: document.getElementById('slideEyebrow'),
    dots: document.querySelectorAll('[data-slide-dot]'),
    prev: document.querySelector('[data-slide-prev]'),
    next: document.querySelector('[data-slide-next]'),
  };

  if (!els.title || !els.sub || !els.eyebrow) return null; // no slider on this page

  let index = 0;
  let timer = null;

  function render() {
    const slide = SLIDES[index];
    els.title.style.opacity = 0;
    els.sub.style.opacity = 0;
    setTimeout(() => {
      els.title.textContent = slide.title;
      els.sub.textContent = slide.sub;
      els.eyebrow.textContent = slide.eyebrow;
      els.title.style.opacity = 1;
      els.sub.style.opacity = 1;
    }, TRANSITION_MS);
    els.dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
  }

  function goTo(i) {
    index = ((i % SLIDES.length) + SLIDES.length) % SLIDES.length;
    render();
    restartAutoplay();
  }

  function step(delta) {
    goTo(index + delta);
  }

  function restartAutoplay() {
    if (REDUCE_MOTION) return;
    clearInterval(timer);
    timer = setInterval(() => step(1), AUTOPLAY_MS);
  }

  els.prev?.addEventListener('click', () => step(-1));
  els.next?.addEventListener('click', () => step(1));
  els.dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  restartAutoplay();

  return { goTo, step };
})();

/**
 * Quick contact form (home page only): intercepts submit for this
 * static-hosted site and shows an inline confirmation message.
 */
const QuickContactForm = (() => {
  const form = document.querySelector('[data-quick-form]');
  const status = document.getElementById('formStatus');
  if (!form || !status) return null;

  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.action) {
      status.textContent = "This form isn't connected yet. Please call us at (281) 376-9068.";
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    status.textContent = 'Sending…';

    try {
      const response = await fetch(form.action, {
        method: form.method || 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        status.textContent = "Thank you! We'll be in touch shortly.";
        form.reset();
      } else {
        status.textContent = 'Something went wrong sending your message. Please call us at (281) 376-9068.';
      }
    } catch (error) {
      status.textContent = 'Something went wrong sending your message. Please call us at (281) 376-9068.';
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  return { form };
})();

/**
 * Scroll-reveal: fades/slides ".reveal" elements in as they enter the
 * viewport. Skips the observer entirely under reduced-motion.
 */
(() => {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  if (REDUCE_MOTION || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('in'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );
  targets.forEach((el) => observer.observe(el));
})();

/**
 * Sticky header shadow + back-to-top button: both driven by scroll position.
 */
(() => {
  const header = document.querySelector('header.site');
  const scrollTopBtn = document.getElementById('scrollTop');
  if (!header && !scrollTopBtn) return;

  scrollTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: REDUCE_MOTION ? 'auto' : 'smooth' });
  });

  window.addEventListener(
    'scroll',
    () => {
      scrollTopBtn?.classList.toggle('show', window.scrollY > 500);
      header?.classList.toggle('scrolled', window.scrollY > 8);
    },
    { passive: true }
  );
})();

/**
 * Printable New Patient Form: triggers the browser print dialog, styled
 * via the @media print rules in style.css. No-ops if the button isn't present.
 */
(() => {
  const printBtn = document.getElementById('printFormBtn');
  if (!printBtn) return;
  printBtn.addEventListener('click', () => window.print());
})();

/**
 * Testimonials: renders every patient review into the grid, with a
 * colored initials avatar per card. No-ops if the grid isn't present.
 */
const Testimonials = (() => {
  const grid = document.getElementById('testimonialGrid');
  if (!grid) return null;

  const AVATAR_COLORS = ['#3f8fae', '#c98a3c', '#5f9c7a', '#8a6fb0', '#c05d6b', '#4f7bbf'];

  const TESTIMONIALS = [
    { name: 'Melissa R.', meta: 'Patient since 2021', stars: 5, date: '3 weeks ago',
      quote: "Dr. Doshi and his team made my daughter's first dental visit completely stress-free. They were patient, kind, and explained everything in a way she could understand. We'll be back for sure." },
    { name: 'David K.', meta: 'Patient since 2014', stars: 5, date: '1 month ago',
      quote: "I've been coming here for over ten years and the quality of care has never dropped. Same friendly faces at the front desk, same thorough exams. Highly recommend for anyone looking for a long-term dentist." },
    { name: 'Angela P.', meta: 'Verified patient', stars: 5, date: '2 months ago',
      quote: "Just finished my Invisalign treatment here and I couldn't be happier with the results. Dr. Doshi walked me through the whole process up front so there were never any surprises." },
    { name: 'Brian T.', meta: 'Patient since 2023', stars: 5, date: '6 weeks ago',
      quote: 'Cracked a tooth on a Sunday night and they got me in first thing Monday morning. Genuinely appreciated how calm and reassuring the whole team was during what felt like an emergency to me.' },
    { name: 'Linda H.', meta: 'Patient since 2018', stars: 5, date: '2 weeks ago',
      quote: 'The front desk staff are always warm and organized, and appointments run on time, which I really value. My whole family switched here after our first visit.' },
    { name: 'Marcus J.', meta: 'Patient since 2022', stars: 4, date: '1 month ago',
      quote: 'Great care overall and everyone on staff is friendly. My only note would be more early-morning appointment slots for those of us with a 9-to-5 — otherwise no complaints.' },
    { name: 'Natalie B.', meta: 'Patient since 2016', stars: 5, date: '5 days ago',
      quote: "My whole family sees Dr. Doshi now, from my youngest to my parents. It's rare to find a practice that's genuinely good with every age group, but this one is." },
    { name: 'Catherine A.', meta: 'Customer since 2025', stars: 5, date: '3 months ago',
      quote: 'Everyone here is warm and professional — from check-in to check-out.' },
    { name: 'Cameron S.', meta: 'Customer since 2025', stars: 5, date: '3 months ago',
      quote: 'Our visit was great from start to finish. The hygienist was patient with my son and made him feel comfortable.' },
    { name: 'Myra S.', meta: 'Customer since 2026', stars: 5, date: '3 months ago',
      quote: 'The staff explained every step of my x-rays and treatment plan, and the costs were laid out upfront with no surprises. They even called later that day to check in on me — that kind of follow-up is rare.' },
    { name: 'Robert F.', meta: 'Patient since 2019', stars: 5, date: '4 months ago',
      quote: 'Quick, painless filling and the numbing wore off faster than I expected. Would recommend to anyone nervous about dental work.' },
    { name: 'Priya N.', meta: 'Patient since 2020', stars: 5, date: '4 months ago',
      quote: 'Booked a same-week cleaning and the whole visit took under an hour. Efficient without ever feeling rushed.' },
    { name: 'Trevor W.', meta: 'Verified patient', stars: 4, date: '5 months ago',
      quote: 'Solid experience overall. Would love a text-reminder option in addition to the phone call.' },
    { name: 'Samantha O.', meta: 'Patient since 2017', stars: 5, date: '5 months ago',
      quote: 'My kids actually look forward to their checkups here, which says a lot.' },
    { name: 'Gregory H.', meta: 'Patient since 2024', stars: 5, date: '6 months ago',
      quote: "Needed a crown replaced and they walked me through cost and insurance coverage before doing anything. No surprises on the bill." },
    { name: 'Vanessa C.', meta: 'Patient since 2015', stars: 5, date: '6 months ago',
      quote: "Been a patient for almost a decade. Consistent, careful, and never pushy about treatments I don't need." },
    { name: 'Oscar D.', meta: 'Customer since 2025', stars: 5, date: '7 months ago',
      quote: 'Front desk got my insurance sorted out in minutes. Appreciated how organized everything was.' },
    { name: 'Renee P.', meta: 'Patient since 2023', stars: 5, date: '7 months ago',
      quote: 'Had a lot of anxiety going in for a root canal, but the whole team kept checking in on me and it was over before I knew it.' },
    { name: 'Aaron M.', meta: 'Verified patient', stars: 4, date: '8 months ago',
      quote: 'Good visit, friendly staff. Parking can be tight during peak hours but that’s a minor thing.' },
    { name: 'Hannah T.', meta: 'Patient since 2026', stars: 5, date: '8 months ago',
      quote: "Switched here after moving to Spring and I'm glad I did. Thorough exam, clear explanations, zero pressure." },
    { name: 'Diane K.', meta: 'Patient since 2019', stars: 5, date: '9 months ago',
      quote: 'Been coming here since I moved to Spring. Everyone remembers my name, which says a lot about how they treat patients.' },
    { name: 'Felix R.', meta: 'Verified patient', stars: 5, date: '9 months ago',
      quote: 'Got a same-day emergency extraction. Painless, and the follow-up call the next day was a nice touch.' },
    { name: 'Isabel M.', meta: 'Patient since 2021', stars: 5, date: '10 months ago',
      quote: 'Love that they explain insurance coverage clearly before any procedure. No surprise bills, ever.' },
    { name: 'Connor B.', meta: 'Patient since 2020', stars: 4, date: '10 months ago',
      quote: 'Overall very happy. Wait times can run a little long on Mondays but the care makes up for it.' },
  ];

  function initials(name) {
    return name.split(' ').map((part) => part[0]).join('').replace(/[^A-Z]/g, '').slice(0, 2);
  }

  function starsMarkup(count) {
    return '<svg viewBox="0 0 24 24"><use href="#ic-star"/></svg>'.repeat(count);
  }

  function cardMarkup(t, i) {
    return `
      <div class="testimonial-card">
        <span class="quote-mark" aria-hidden="true">&ldquo;</span>
        <div class="tcard-top">
          <div class="tcard-avatar" style="background:${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${initials(t.name)}</div>
          <div class="tcard-id">
            <span class="reviewer-name">${t.name} <svg class="verified-badge" viewBox="0 0 24 24"><use href="#ic-check"/></svg></span>
            <span class="reviewer-meta">${t.meta}</span>
          </div>
        </div>
        <span class="rating-stars" aria-hidden="true">${starsMarkup(t.stars)}</span>
        <p class="quote">${t.quote}</p>
        <span class="review-date">${t.date}</span>
      </div>
    `;
  }

  function render() {
    const marquee = document.getElementById('testimonialMarquee');
    const canScroll = !REDUCE_MOTION && marquee;

    if (canScroll) {
      // Render the list twice back-to-back so translateX(-50%) loops seamlessly.
      grid.innerHTML = TESTIMONIALS.map(cardMarkup).join('') + TESTIMONIALS.map(cardMarkup).join('');
      grid.classList.add('is-track');
      marquee.classList.add('is-scrolling');
      grid.style.animationDuration = `${TESTIMONIALS.length * 7}s`;
    } else {
      grid.innerHTML = TESTIMONIALS.map(cardMarkup).join('');
    }

    const countEl = document.getElementById('reviewCount');
    if (countEl) countEl.textContent = TESTIMONIALS.length;
  }

  render();
  return { TESTIMONIALS };
})();

/**
 * Patient education articles (page 1 of 8): renders original short articles
 * with category filtering via the sidebar. No-ops if the list isn't present.
 */
const ARTICLES_P1 = [
    { title: 'About Pediatric Dentistry', category: 'Pediatric Dentistry',
      body: "Pediatric dentistry focuses on the unique oral health needs of infants, children, and teenagers, from monitoring early tooth development to building comfortable, positive habits around dental visits. Most dentists recommend a child's first checkup shortly after their first tooth appears, ideally by their first birthday, so any concerns can be caught and addressed early. Starting young also helps children grow up seeing the dentist as a normal, low-stress part of staying healthy." },
    { title: 'Adult Orthodontic Treatment', category: 'Orthodontics',
      body: "Straightening teeth isn't only for teenagers — a growing number of adults pursue orthodontic treatment to correct crowding, gaps, or bite issues that were never addressed earlier in life. Because adult jaws have finished growing, treatment sometimes takes a bit longer than it would for a child, but modern options like clear aligners make the process far less noticeable day to day. Properly aligned teeth are also easier to clean and less prone to uneven wear." },
    { title: 'Aging and Oral Health', category: 'Oral Health',
      body: "As we age, oral health needs shift — receding gums, drier mouths from medications, and years of wear on fillings or crowns can all increase the risk of new problems. Regular checkups become even more important for older patients, since many age-related issues develop gradually and are easiest to treat when caught early. Simple daily habits, paired with routine professional cleanings, go a long way toward protecting a lifetime of dental work." },
    { title: 'Air Abrasion', category: 'Technology',
      body: "Air abrasion is a gentle, drill-free way to treat very early tooth decay, using a fine stream of particles to remove damaged enamel without the heat, vibration, or noise associated with traditional drilling. Because it's quieter and often requires less numbing, it can be a good option for patients who feel anxious about the sound or sensation of a standard drill. It's best suited to small, shallow areas of decay rather than more extensive restorative work." },
    { title: 'Anesthesia Wand', category: 'Technology',
      body: "The anesthesia wand is a computer-controlled device that delivers numbing medication through a needle far thinner than what's used in a traditional syringe, at a slow, steady, regulated rate. That gentler delivery is often more comfortable than a standard injection, since sudden pressure is one of the main things patients notice and dislike. It's particularly useful for numbing a single tooth precisely, without numbing a larger area than necessary." },
    { title: 'Antibiotic Premedication', category: 'Oral Health',
      body: "Some patients — particularly those with certain heart conditions, joint replacements, or compromised immune systems — may need to take antibiotics before certain dental procedures as a precaution against infection. Dental work can briefly allow bacteria from the mouth into the bloodstream, which is usually harmless but can pose a risk for specific patients. If you have a relevant medical history, let your dental team know so they can coordinate the right precautions with your physician." },
    { title: 'Apicoectomy', category: 'Endodontics',
      body: "An apicoectomy is a minor surgical procedure performed when infection or inflammation persists at the tip of a tooth's root even after a root canal. Rather than removing the tooth, the dentist accesses the root tip through the gum, removes the infected tissue, and seals the area to prevent further problems. It's typically considered a tooth-saving option, reserved for cases where a standard root canal alone hasn't fully resolved the issue." },
    { title: 'Bad Breath', category: 'Oral Health',
      body: "Persistent bad breath, known clinically as halitosis, is most often caused by bacteria that build up on the tongue, between teeth, and along the gumline when oral hygiene routines miss those areas. Diet, dry mouth, and certain health conditions can also play a role. Regular brushing and flossing — including the tongue — along with routine cleanings, resolves most cases; breath that doesn't improve despite good hygiene is worth mentioning at your next visit." },
    { title: 'Bite Problems', category: 'Orthodontics',
      body: "A misaligned bite, where the upper and lower teeth don't meet properly, can affect chewing and speech, and put uneven stress on certain teeth over time. Bite problems range from mild to significant and can often be corrected with orthodontic treatment, which gradually guides teeth — and sometimes the jaw — into better alignment. Left unaddressed, more serious bite issues can eventually contribute to jaw discomfort or accelerated wear on specific teeth." },
    { title: 'Blood Pressure Medications and Your Oral Health', category: 'Oral Health',
      body: "Certain blood pressure medications can cause side effects that affect the mouth, including dry mouth, gum swelling, or changes in taste. A dry mouth in particular raises the risk of cavities and gum disease, since saliva plays an important role in rinsing away bacteria and food particles. If you take medication for blood pressure, let your dental team know — they can recommend simple strategies to manage any oral side effects." },
    { title: 'Blood Thinners and Oral Surgery', category: 'Oral Surgery',
      body: "Patients taking blood-thinning medication need special consideration before any oral surgery, including extractions, since these medications affect how the body clots afterward. In most cases blood thinners aren't stopped entirely, as the risks of pausing them typically outweigh the risks of dental bleeding, but your dental and medical providers will coordinate the safest approach. Always share a complete, current medication list with your dental team before any surgical treatment." },
    { title: 'Bonding', category: 'Cosmetic & General Dentistry',
      body: "Dental bonding uses a tooth-colored composite resin to repair small chips, cracks, gaps, or discoloration in a single, relatively quick office visit. The material is applied directly to the tooth, shaped, and hardened with a curing light, then polished to blend naturally with the surrounding enamel. It's one of the most conservative cosmetic options available, since it typically requires little to no removal of healthy tooth structure." },
    { title: 'Bone Grafting', category: 'Implant Dentistry',
      body: "When the jawbone has lost density — often after a tooth has been missing for a while — bone grafting adds material to rebuild a stable foundation, most commonly to prepare a site for a dental implant. The graft encourages the body to regenerate its own healthy bone over time. It's a common, well-established step in implant planning, and healing time varies depending on how much rebuilding the site needs before the implant procedure can move forward." },
    { title: 'Bridges', category: 'Cosmetic & General Dentistry',
      body: "A dental bridge replaces one or more missing teeth by anchoring a false tooth to the natural teeth, or implants, on either side of the gap. Beyond restoring your smile, bridges help maintain even chewing pressure and prevent neighboring teeth from gradually shifting into the empty space, which can otherwise lead to bite problems down the line. With proper care, a well-fitted bridge can last many years." },
    { title: 'Broken Teeth', category: 'Endodontics',
      body: "A chipped, cracked, or broken tooth is one of the most common dental injuries, often the result of an accident, grinding, biting something hard, or a cavity that has weakened the tooth over time. Treatment depends on how severe the damage is — minor chips may just need smoothing or bonding, while deeper fractures can require a crown or root canal. Any broken tooth should be evaluated promptly, since untreated damage can worsen or lead to infection." },
    { title: 'Brushing and Flossing with Braces', category: 'Orthodontics',
      body: "Braces create extra nooks where food and plaque can hide, so keeping up a thorough brushing and flossing routine is especially important during orthodontic treatment. It generally helps to brush after every meal, angle the brush to clean around each bracket, and use a floss threader or interdental brush to reach beneath the wire. Staying consistent protects against the white spots and cavities that can otherwise develop around brackets by the time braces come off." },
];

const ARTICLES_P2 = [
    { title: 'Bruxism', category: 'Cosmetic & General Dentistry',
      body: "Bruxism is the clinical term for grinding or clenching your teeth, often without realizing it — many people do it in their sleep. Over time, the repeated pressure can wear down enamel, loosen fillings, and even lead to jaw soreness or headaches. A custom nightguard is one of the most common ways to protect your teeth from ongoing damage while any underlying stress or bite issues are addressed." },
    { title: 'Clear Aligners for Adults', category: 'Orthodontics',
      body: "Clear aligners give adults a way to straighten their teeth without the look of traditional metal braces, using a series of custom, removable trays that gradually shift teeth into place. Because they can be taken out for eating and brushing, they tend to fit more easily into a busy adult schedule. Treatment length varies by case, but many adults see noticeable movement within just a few months." },
    { title: 'Clear Aligners for Teens', category: 'Orthodontics',
      body: "Clear aligners work well for many teens too, offering a more discreet alternative to metal braces during a stage of life when appearance often matters a lot. Because they're removable, success depends on wearing them consistently — most plans call for around 20 to 22 hours a day. Many aligner systems include wear indicators, which help both teens and parents track how consistently they're being worn." },
    { title: 'Cleft Lip and Palate', category: 'Oral Surgery',
      body: "A cleft lip or cleft palate is a birth condition where the tissue forming the lip or roof of the mouth doesn't fully join together during early development. Both can affect feeding, speech, and dental development as a child grows, so care usually involves a team of specialists working together over several years. Early evaluation helps families understand what treatment — often including surgery, orthodontics, and speech support — will be needed." },
    { title: 'Combined Root and Gum Problems', category: 'Endodontics',
      body: "Sometimes tooth pain has more than one cause at once — an infection inside the tooth and gum disease affecting the tissue around it can occur together and make diagnosis trickier. Because the two conditions can share overlapping symptoms, like swelling or sensitivity, a thorough exam is needed to determine exactly what's happening. Addressing both issues together gives the tooth the best chance of staying healthy long-term." },
    { title: 'Common Dental Procedures', category: 'Cosmetic & General Dentistry',
      body: "Most dental visits fall into one of a few familiar categories: preventive care like cleanings and exams, restorative work like fillings and crowns, and cosmetic treatments that improve how a smile looks. Which procedures a patient needs depends entirely on their individual oral health, from routine maintenance to repairing damage. Understanding the basics of what each procedure involves can make a dental visit feel far less unfamiliar." },
    { title: 'Cone Beam CT Imaging', category: 'Technology',
      body: "Cone beam CT imaging captures a detailed three-dimensional view of the teeth, jaw, and surrounding bone, giving dentists far more information than a standard two-dimensional X-ray. That extra detail is especially useful for planning implants, evaluating impacted teeth, or investigating the source of pain that isn't obvious otherwise. The scan itself is quick and non-invasive, typically taking less than a minute." },
    { title: 'Consequences of Losing Teeth', category: 'Implant Dentistry',
      body: "Losing even one tooth can set off a chain of effects beyond the gap itself — nearby teeth may shift to fill the space, chewing patterns can change, and the jawbone in that area can begin to lose density without a tooth root to stimulate it. Left unaddressed, these changes can affect both function and the shape of your face over time. Replacing a missing tooth promptly helps prevent these knock-on effects." },
    { title: 'Corrective Jaw Surgery', category: 'Oral Surgery',
      body: "Corrective jaw surgery, also called orthognathic surgery, repositions the upper or lower jaw to correct significant bite or alignment problems that braces alone can't fully address. It's typically considered when a discrepancy between the jaws affects chewing, speech, or breathing, and is often planned alongside orthodontic treatment before and after the procedure. Recovery takes time, but the surgery can meaningfully improve both function and facial balance." },
    { title: 'Cosmetic Gum Surgery', category: 'Periodontal Therapy',
      body: "Cosmetic gum surgery reshapes the gumline to correct an uneven smile, whether that means removing excess tissue that makes teeth look short or adding tissue where the gums have receded too far. It's generally a straightforward, minimally invasive procedure with a fairly quick recovery. Beyond appearance, well-contoured gums can also make it easier to keep the area clean and healthy." },
    { title: 'Crown Lengthening', category: 'Cosmetic & General Dentistry',
      body: "Crown lengthening removes a small amount of gum and sometimes bone tissue to expose more of a tooth's natural surface, either for cosmetic reasons or to prepare a damaged tooth for a restoration like a crown. It's often used when a tooth has broken below the gumline, since there needs to be enough exposed structure for a crown to attach properly. The procedure is typically done in-office and heals over the following one to two weeks." },
    { title: 'Crowns', category: 'Cosmetic & General Dentistry',
      body: "A dental crown is a custom-made cap that covers a tooth entirely, restoring its shape, strength, and appearance after significant decay, a large filling, or a fracture. Crowns are typically made from materials like porcelain or zirconia, chosen to blend naturally with surrounding teeth. With good care, a well-fitted crown can last well over a decade." },
    { title: 'Dental Exams and Professional Cleanings', category: 'Oral Health',
      body: "Routine exams and cleanings, usually recommended twice a year, let your dentist catch small issues — like early cavities or gum inflammation — before they turn into bigger problems. A professional cleaning also removes plaque and tartar buildup that brushing and flossing at home can't fully reach. Together, these regular visits are one of the simplest, most effective ways to protect your long-term oral health." },
    { title: 'Dental Implant FAQs', category: 'Implant Dentistry',
      body: "Dental implants replace a missing tooth root with a small titanium post, topped with a custom crown designed to match your natural teeth. Common questions include how long they last (often decades with good care), whether placement hurts (it's done under local anesthesia, so discomfort is minimal), and how long healing takes (typically a few months, since the implant needs time to fuse with the jawbone before the final crown is attached)." },
    { title: 'Dental Implants', category: 'Implant Dentistry',
      body: "Dental implants are widely considered the most durable way to replace a missing tooth, since they replace both the root and the visible crown rather than just sitting on top of the gum. Because the implant fuses with the jawbone over time, it also helps prevent the bone loss that often follows tooth loss. The process happens in stages, but the result is a replacement tooth that looks, feels, and functions much like a natural one." },
    { title: 'Dentures', category: 'Cosmetic & General Dentistry',
      body: "Dentures are removable replacements for some or all of your natural teeth, custom-made to fit your mouth and restore both function and appearance. Full dentures replace an entire arch of teeth, while partial dentures fill in gaps where some natural teeth remain. Modern dentures are designed for a more natural look and feel than older versions, and most patients adjust to eating and speaking comfortably within a few weeks." },
];

const ARTICLES_P3 = [
    { title: 'Diabetes and Oral Health', category: 'Oral Health',
      body: "Diabetes and oral health are closely connected — elevated blood sugar can make it harder for the body to fight infection, which raises the risk of gum disease and slower healing after dental procedures. At the same time, untreated gum disease can make blood sugar more difficult to control, creating a two-way relationship worth managing carefully. Keeping up with regular cleanings and letting your dental team know about your diabetes management helps catch issues early." },
    { title: 'Digital Dental Impressions', category: 'Technology',
      body: "Digital impressions use a small handheld scanner to capture a precise 3D model of your teeth, replacing the traditional putty-like material many patients find uncomfortable. Beyond the improved comfort, digital scans tend to be faster and more accurate, which can mean a better fit for crowns, aligners, or other custom dental work. The files can also be shared electronically with a dental lab, often speeding up turnaround time." },
    { title: 'Digital X-Rays', category: 'Technology',
      body: "Digital X-rays capture images of the teeth and jaw using significantly less radiation than older film-based X-rays, while producing images that can be viewed, enlarged, and enhanced instantly on a screen. That instant feedback helps your dentist spot issues like decay between teeth or below the gumline that aren't visible during a standard exam. Because the images are stored digitally, they're also easy to compare against past visits to track changes over time." },
    { title: 'Dry Mouth', category: 'Oral Health',
      body: "Dry mouth, or xerostomia, happens when the salivary glands don't produce enough saliva to keep the mouth properly moist. Since saliva helps wash away food particles and neutralize acid, a persistently dry mouth raises the risk of cavities, bad breath, and gum irritation. Common causes include certain medications, dehydration, and some health conditions, so it's worth mentioning ongoing dryness to your dental team so they can suggest ways to manage it." },
    { title: 'Early Orthodontic Treatment', category: 'Orthodontics',
      body: "Early, or interceptive, orthodontic treatment is used in some children to address developing bite or spacing issues while the jaw is still growing and easier to guide. Not every child needs it, but for those who do, treating a problem early can sometimes simplify or shorten orthodontic treatment later on. An orthodontic evaluation around age seven is generally recommended so any concerns can be caught while there's still time to act on them." },
    { title: 'Eating Disorders and Oral Health', category: 'Oral Health',
      body: "Eating disorders can take a serious toll on oral health, particularly when frequent vomiting exposes teeth to stomach acid that gradually wears away enamel. Nutritional deficiencies common with disordered eating can also affect gum health and slow healing. Dentists are sometimes among the first to notice warning signs, and can be an important part of a broader care team supporting someone's recovery." },
    { title: 'Extractions', category: 'Oral Surgery',
      body: "A tooth extraction is usually considered a last resort, reserved for situations where a tooth is too damaged, decayed, or misaligned to be saved through other treatment. Simple extractions are done under local anesthesia for teeth that are fully visible above the gumline, while more complex cases — like an impacted tooth — may require a surgical approach. Afterward, your dentist will walk you through simple care instructions to support healing and, if needed, discuss replacement options." },
    { title: 'Facial Trauma and Reconstructive Surgery', category: 'Oral Surgery',
      body: "Facial trauma refers to injuries affecting the teeth, jaw, or soft tissue of the face, often resulting from falls, sports injuries, or accidents. Depending on severity, treatment can range from repairing a chipped tooth to more involved reconstructive surgery to restore the structure and function of the jaw. Oral and maxillofacial surgeons are specially trained to handle these injuries, working to protect both appearance and long-term function." },
    { title: 'Fillings', category: 'Cosmetic & General Dentistry',
      body: "A filling repairs a tooth after decay has created a cavity, removing the damaged portion and restoring the tooth's shape with a durable material like composite resin. Catching decay early generally means a smaller, simpler filling; left untreated, the same cavity can grow large enough to eventually require a crown or root canal. Modern tooth-colored fillings also blend naturally with surrounding teeth, so they're far less noticeable than older metal fillings." },
    { title: 'Fluoride Treatments', category: 'Oral Health',
      body: "Fluoride is a naturally occurring mineral that helps strengthen tooth enamel and makes it more resistant to the acid that causes decay. While toothpaste and drinking water provide some fluoride, a professional fluoride treatment delivers a more concentrated dose directly to the teeth during a routine visit. It's a quick, painless addition to a cleaning that can meaningfully lower the risk of future cavities, especially for patients who are more cavity-prone." },
    { title: 'Fluoride and Your Child', category: 'Pediatric Dentistry',
      body: "Fluoride plays an especially important role while a child's teeth are still developing, helping strengthen enamel from the earliest stages. Pediatric dentists often recommend fluoride toothpaste as soon as the first tooth appears, using just a small amount for very young children, along with occasional in-office treatments as they grow. Getting the right amount matters, so it's worth discussing your child's specific fluoride needs at their regular checkups." },
    { title: 'Geographic Tongue', category: 'Oral Health',
      body: "Geographic tongue is a harmless condition where smooth, irregular patches appear on the surface of the tongue, giving it a map-like appearance that can shift in shape and location over time. It isn't contagious and doesn't usually require treatment, though some people notice mild sensitivity to spicy or acidic foods when patches are present. If the appearance changes significantly or causes ongoing discomfort, it's still worth having your dentist take a look." },
    { title: 'Gum Emergencies', category: 'Emergency Care',
      body: "Injuries to the gums, tongue, or inner cheek — from a sports collision, an accidental bite, or a fall — can bleed heavily even when the underlying damage is minor, which can be alarming. Rinsing gently with salt water, applying light pressure with clean gauze, and using a cold compress can help manage bleeding and swelling until you're seen. Persistent bleeding or a deeper wound should be evaluated promptly by your dentist or an emergency room." },
    { title: 'Gum Grafting', category: 'Periodontal Therapy',
      body: "Gum grafting adds tissue to areas where the gumline has receded, exposing more of the tooth root than is healthy. Left untreated, significant recession can lead to increased sensitivity and a higher risk of further bone or tissue loss around the tooth. The procedure, typically performed by a periodontist, both protects the tooth and can restore a more even, natural-looking gumline." },
    { title: 'How to Brush and Floss', category: 'Oral Hygiene',
      body: "Good brushing technique means angling the brush toward the gumline and using gentle, circular motions for about two minutes, twice a day — scrubbing too hard can actually wear down enamel and irritate gums. Flossing reaches the tight spaces between teeth that a toothbrush can't, removing plaque before it hardens into tartar. Doing both consistently, rather than perfectly, is what actually protects your teeth day to day." },
    { title: 'How to Prevent Cavities', category: 'Oral Hygiene',
      body: "Cavities form when acid — produced by bacteria feeding on sugars and starches — gradually wears through tooth enamel. The most effective prevention combines consistent brushing and flossing, limiting frequent snacking on sugary or starchy foods, and keeping up with regular dental checkups where small areas of decay can be caught early. Fluoride, whether from toothpaste, water, or an in-office treatment, adds an extra layer of protection along the way." },
];

const ARTICLES_P4 = [
    { title: 'Implant Care and Maintenance', category: 'Implant Dentistry',
      body: "Dental implants don't decay the way natural teeth can, but the gum and bone tissue around them still needs regular care to stay healthy. Daily brushing and flossing around the implant, paired with routine dental visits, helps prevent a condition called peri-implantitis, where inflammation around the implant can eventually threaten its stability. With consistent care, most implants go on to function well for decades." },
    { title: 'Implant Dentures', category: 'Implant Dentistry',
      body: "Implant dentures combine the stability of dental implants with the full-arch coverage of traditional dentures, anchoring a denture securely with a small number of implant posts rather than relying on suction or adhesive alone. That extra stability can make a noticeable difference for patients who've struggled with a loose-fitting denture, improving both chewing comfort and confidence. The number of implants needed depends on the individual case and the type of denture being placed." },
    { title: 'Inlays and Onlays', category: 'Cosmetic & General Dentistry',
      body: "Inlays and onlays are custom-made restorations used when a cavity or damaged area is too large for a standard filling but not extensive enough to need a full crown. An inlay fits within the grooves of a tooth, while an onlay also covers one or more of the tooth's cusps for broader support. Made from durable materials like porcelain, they're bonded precisely to the tooth, preserving more natural structure than a crown would require." },
    { title: 'Interdental Cleaning Devices', category: 'Oral Hygiene',
      body: "Interdental cleaning devices — including floss, floss picks, water flossers, and small interdental brushes — are designed to clean the tight spaces between teeth that a regular toothbrush can't reach. Different devices work better for different mouths; someone with braces or wider gaps between teeth may find an interdental brush easier to use than traditional floss. Your dental team can help you find the option that fits your routine and actually gets used consistently." },
    { title: 'Intraoral Camera', category: 'Technology',
      body: "An intraoral camera is a small, pen-sized tool that captures close-up, magnified images inside your mouth, letting you see exactly what your dentist sees on a chairside screen. That visual clarity makes it easier to understand a diagnosis, whether it's a cracked tooth, early decay, or a spot of wear that's hard to describe in words alone. It's a quick, painless part of many exams that helps patients feel more informed about their own care." },
    { title: 'Laser Decay Diagnostics', category: 'Technology',
      body: "Laser decay diagnostics use a small handheld device to detect early tooth decay that might not yet be visible on an X-ray or during a visual exam. The laser measures how light reflects off tooth structure, since healthy enamel and decayed enamel respond differently, flagging areas that may need closer attention. Catching decay at this early stage often means a much smaller, simpler treatment than waiting until a cavity is fully formed." },
    { title: 'Laser Dentistry', category: 'Technology',
      body: "Laser dentistry uses focused light energy to treat a range of soft- and hard-tissue procedures, from reshaping gum tissue to treating small areas of decay, often with less bleeding and a shorter recovery than traditional methods. Because lasers are precise, they can also mean less discomfort and, in some cases, less need for anesthesia. Not every procedure calls for a laser, but where it's appropriate, many patients find it a gentler experience." },
    { title: 'Loose Teeth and Bite Problems', category: 'Periodontal Therapy',
      body: "A loose baby tooth is a normal part of growing up, but a loose permanent tooth is a sign something needs attention — often advancing gum disease that has weakened the bone and tissue supporting the tooth. Left untreated, a loose adult tooth can eventually be lost, and the shifting can also throw off your bite. Prompt periodontal evaluation gives the best chance of stabilizing the tooth and addressing the underlying cause." },
    { title: 'Missing Teeth', category: 'Oral Health',
      body: "A missing tooth affects more than appearance — it can change how you chew, put extra pressure on neighboring teeth, and, over time, lead to bone loss in the jaw where the tooth used to be. Whatever the cause, from decay to injury to a tooth that never developed, replacement options like an implant, bridge, or denture can restore both function and a complete smile. The sooner a gap is addressed, the easier it typically is to prevent these secondary effects." },
    { title: 'Mouthguards', category: 'Cosmetic & General Dentistry',
      body: "A properly fitted mouthguard is one of the simplest ways to protect your teeth during sports or other activities with a risk of impact to the face. Custom mouthguards, made by your dentist from a mold of your own teeth, tend to fit and protect better than generic store-bought versions. Beyond preventing chipped or knocked-out teeth, a good mouthguard can also help cushion the jaw against more serious injury." },
    { title: 'Mouthwash', category: 'Oral Hygiene',
      body: "Mouthwash can be a useful addition to a brushing and flossing routine, but it isn't a substitute for either one. Different formulas serve different purposes — some target bad breath, others help reduce plaque or strengthen enamel with added fluoride, and some are designed to soothe sensitive gums. Because not every mouthwash is right for every mouth, it's worth asking your dentist which type, if any, best fits your needs." },
    { title: 'Nitrous Oxide', category: 'Cosmetic & General Dentistry',
      body: "Nitrous oxide, often called laughing gas, is a mild sedative inhaled through a small nasal mask to help patients feel calmer and more comfortable during dental treatment. Its effects wear off quickly once the mask is removed, so most patients can drive themselves home afterward. It's generally considered one of the safest sedation options available, making it a common choice for patients with mild dental anxiety." },
    { title: 'Nitrous Oxide for Children', category: 'Pediatric Dentistry',
      body: "For children who feel anxious about dental visits, nitrous oxide can help create a calmer, more comfortable experience without the need for deeper sedation. The gas is administered through a small mask and its effects fade almost as soon as it's turned off, which is part of why it's considered such a safe option for younger patients. Pediatric dentists carefully monitor dosage throughout the visit to keep the experience both safe and effective." },
    { title: 'Non-Surgical Periodontal Procedures', category: 'Periodontal Therapy',
      body: "Many cases of gum disease can be treated without surgery, particularly when caught in the earlier stages. Deep cleaning procedures like scaling and root planing remove plaque and tartar from below the gumline and smooth the tooth root, helping gums reattach and heal. Combined with improved home care and more frequent maintenance visits, non-surgical treatment can often stop gum disease from progressing further." },
    { title: 'Nutrition and Oral Health', category: 'Oral Health',
      body: "What you eat has a direct effect on your oral health — frequent sugary or acidic foods feed the bacteria that cause decay, while a balanced diet rich in calcium, vitamin D, and fiber supports strong teeth and healthy gums. Sipping sugary drinks throughout the day tends to be harder on teeth than eating the same amount at one sitting, since it keeps acid levels elevated for longer. Small, consistent dietary habits add up to a meaningful difference over time." },
    { title: 'Oral Cancer Screenings', category: 'Oral Health',
      body: "An oral cancer screening is a quick, painless check of the mouth, throat, and surrounding tissue for early signs of precancerous or cancerous changes, often performed as part of a routine dental exam. Because oral cancer is far more treatable when caught early, this simple screening can make a real difference in outcomes. Anyone can be affected, so regular screenings are recommended for all adult patients regardless of specific risk factors." },
];

const ARTICLES_P5 = [
    { title: 'Oral Cancer Screenings and Surgery', category: 'Oral Surgery',
      body: "When an oral cancer screening reveals an area of concern, next steps often start with further diagnostic testing before any treatment decisions are made. If a biopsy confirms a cancerous or precancerous growth, an oral surgeon may need to remove the affected tissue, sometimes alongside other specialists depending on how far treatment needs to go. Early detection through routine screenings is what makes these situations far more manageable, both medically and for the extent of surgery required." },
    { title: 'Oral Diagnosis and Biopsies', category: 'Oral Surgery',
      body: "When an unusual spot, sore, or growth appears in the mouth and can't be identified through a visual exam or X-rays alone, a biopsy provides a definitive answer by sending a small tissue sample to a lab for analysis. The procedure itself is usually quick and done under local anesthesia. While most biopsies turn out to be benign, getting a clear diagnosis either way gives peace of mind and guides whatever treatment, if any, comes next." },
    { title: 'Oral Hygiene for Kids', category: 'Oral Hygiene',
      body: "Building good oral hygiene habits early helps set children up for a lifetime of healthy teeth. Brushing twice a day with a pea-sized amount of fluoride toothpaste, especially before bed when saliva production naturally slows down, is one of the most effective habits parents can help establish. Making brushing consistent and low-stress — rather than perfect — is usually what actually sticks as kids grow." },
    { title: 'Oral Piercings', category: 'Oral Health',
      body: "Piercings on the tongue, lip, or cheek carry some oral health risks worth knowing about, including infection, chipped teeth from jewelry rubbing against enamel, and gum recession over time. Keeping the pierced area clean and choosing well-fitted jewelry can reduce some of these risks, but any signs of swelling, prolonged bleeding, or infection should be evaluated promptly. If you have an oral piercing, it's worth mentioning it at your regular dental visits." },
    { title: 'Oral Surgery Procedures', category: 'Oral Surgery',
      body: "Oral surgery covers a wide range of procedures involving the teeth, gums, jaw, or facial structures, from a routine tooth extraction to more involved work like corrective jaw surgery. Most common procedures are performed right in a dental office setting under local anesthesia, while more complex cases may require additional sedation or a hospital setting. Your care team will walk you through exactly what to expect and how to prepare, based on the specific procedure." },
    { title: 'Oral Systemic Connection', category: 'Periodontal Therapy',
      body: "Research continues to show a meaningful link between oral health and overall health — conditions like gum disease have been associated with increased risk for issues elsewhere in the body, including heart and respiratory health. The mouth can act as an early indicator of broader health changes, which is part of why regular dental visits matter beyond just your teeth. Sharing your full medical history with your dental team helps them consider your oral health in that bigger picture." },
    { title: 'Orthodontic Emergencies', category: 'Orthodontics',
      body: "Not every issue with braces or aligners requires an emergency visit, but some do need prompt attention — a wire poking into the cheek, a loose bracket, or a broken retainer are common examples. Many minor issues can be temporarily managed at home with dental wax or by calling your orthodontist's office for guidance. More serious problems, like a dislodged or knocked-out tooth, need urgent evaluation right away." },
    { title: 'Orthodontic Emergencies', category: 'Emergency Care',
      body: "If orthodontic pain or a damaged appliance can't be resolved at home, contacting your orthodontist promptly is important — leaving the issue unaddressed can set back your treatment progress or cause further discomfort. Describing what happened clearly when you call helps the office determine how quickly you need to be seen. In the meantime, over-the-counter pain relief and avoiding hard or sticky foods can help manage symptoms." },
    { title: 'Orthodontic FAQs', category: 'Orthodontics',
      body: "Common questions about orthodontics include what an orthodontist actually treats (misalignment, spacing, and bite issues involving the teeth and jaw), when treatment is typically recommended (often starting with an evaluation around age seven, though many patients begin as teens or adults), and how long it takes (anywhere from several months to a few years, depending on the case). An orthodontic consultation is the best way to get answers specific to your own smile." },
    { title: 'Orthodontic Headgear', category: 'Orthodontics',
      body: "Orthodontic headgear applies gentle external pressure to help guide jaw growth and correct more significant bite issues, typically in children and teens whose jaws are still developing. It's usually worn for a set number of hours each day, often overnight, alongside other orthodontic appliances. While it isn't needed for every case, when it is recommended, consistent wear is what makes it effective." },
    { title: 'Orthodontic Retention', category: 'Orthodontics',
      body: "Finishing active orthodontic treatment doesn't mean the process is completely over — teeth naturally want to shift back toward their original position, so a retainer is used afterward to hold them in place while the surrounding bone and tissue stabilize. Retainers may be worn full-time at first and then just at night long-term. Skipping retainer wear is one of the most common reasons teeth relapse after braces or aligners." },
    { title: 'Osteoporosis and Oral Health', category: 'Oral Health',
      body: "Osteoporosis, a condition that weakens bone throughout the body, can also affect the jawbone that supports your teeth. It's worth discussing with your dentist if you're being treated for osteoporosis, since certain medications used for the condition can occasionally affect healing after some dental procedures. Regular dental checkups help monitor jawbone health alongside your broader osteoporosis care." },
    { title: 'Periodontal Disease', category: 'Periodontal Therapy',
      body: "Periodontal, or gum, disease begins with inflammation caused by plaque buildup along the gumline and, left untreated, can progress to affect the bone that holds teeth in place. Early symptoms like redness or bleeding when brushing are easy to overlook but important to address before the condition advances. Regular cleanings and good home care are the most effective ways to prevent gum disease from developing in the first place." },
    { title: 'Periodontal Flap Surgery', category: 'Periodontal Therapy',
      body: "Periodontal flap surgery is used to treat more advanced gum disease, where deep pockets have formed between the gums and teeth that can't be fully cleaned with a standard deep cleaning. The gum tissue is gently lifted to allow thorough removal of bacteria and tartar from below the surface, then repositioned to fit more closely against the tooth. This helps reduce pocket depth and makes ongoing maintenance more effective going forward." },
    { title: 'Periodontal Therapy Procedures', category: 'Periodontal Therapy',
      body: "Periodontal therapy covers a range of treatments for gum disease, from non-surgical options like deep cleaning to more involved procedures like flap surgery or grafting, depending on how advanced the condition is. The right approach depends on how much damage has already occurred to the gum and bone tissue. Catching gum disease early generally means simpler, less invasive treatment is enough to bring it back under control." },
    { title: 'Pregnancy and Oral Health', category: 'Oral Health',
      body: "Hormonal changes during pregnancy can make gums more sensitive and prone to inflammation, a condition sometimes called pregnancy gingivitis, which shows up as redness, swelling, or bleeding when brushing. Keeping up with regular brushing, flossing, and dental checkups during pregnancy is safe and important, since untreated gum inflammation has been linked to other pregnancy-related concerns. Let your dental team know you're pregnant so they can tailor care and timing appropriately." },
];

const ARTICLES_P6 = [
    { title: "Pregnancy and Your Child's Developing Teeth", category: 'Pediatric Dentistry',
      body: "A baby's teeth actually begin forming well before birth, starting to develop beneath the gums during early pregnancy. Because tooth development draws on nutrients like calcium and vitamin D, eating a balanced diet during pregnancy supports healthy tooth formation before that first tooth ever appears. Good prenatal oral health also matters for the parent — untreated gum inflammation during pregnancy has been linked to other health considerations, so regular dental care shouldn't be skipped just because you're expecting." },
    { title: 'Preventive Dentistry', category: 'Oral Health',
      body: "Preventive dentistry is built around the idea that avoiding problems is easier, less expensive, and less invasive than treating them after they develop. Daily brushing and flossing, routine cleanings, and regular exams work together to catch small issues — like early decay or gum inflammation — before they become bigger ones. Consistent preventive care over the years is one of the biggest factors in keeping a smile healthy for a lifetime." },
    { title: 'Root Canal FAQs', category: 'Endodontics',
      body: "Common questions about root canals include what the procedure actually treats (infection or damage inside the tooth's inner pulp), whether it's painful (modern techniques with local anesthesia make it comparable to getting a filling), and how long recovery takes (most patients return to normal activities within a day or two). The tooth is typically restored with a crown afterward to protect it and restore full function." },
    { title: 'Root Canal Retreatment', category: 'Endodontics',
      body: "Occasionally a tooth that's already had a root canal doesn't heal as expected, or a new infection develops around the same root — in those cases, retreatment can often save the tooth a second time. The endodontist reopens the tooth, removes the previous filling material, cleans the canals again, and reseals them. Because the alternative is usually extraction, retreatment is generally worth pursuing when it's a viable option." },
    { title: 'Root Canal Treatment', category: 'Endodontics',
      body: "A root canal removes infected or inflamed tissue from inside a tooth, cleans and disinfects the space, and seals it to prevent further infection — allowing a tooth that might otherwise need extraction to be saved. Despite its reputation, the procedure itself is designed to relieve pain caused by the infection, not cause it. Afterward, a crown is often placed to restore the tooth's strength for everyday use." },
    { title: 'Root Canal Treatment for Children', category: 'Endodontics',
      body: "Children's teeth can need root canal-type treatment too, usually following deep decay or an injury that's damaged the tooth's inner pulp. Because baby teeth hold space for permanent teeth and support healthy chewing and speech development, saving a damaged baby tooth is often preferable to early extraction when possible. Pediatric dentists use techniques adapted specifically for young patients and developing teeth." },
    { title: 'Same-Day Crowns', category: 'Technology',
      body: "Same-day crown technology uses a digital scanner and an in-office milling machine to design and create a custom crown during a single visit, eliminating the need for a temporary crown and a follow-up appointment weeks later. The tooth is scanned digitally rather than using traditional impression material, and the finished crown is typically ready within an hour or two. It's a convenient option that has become increasingly common as the technology has improved." },
    { title: 'Sealants', category: 'Pediatric Dentistry',
      body: "Dental sealants are a thin protective coating applied to the chewing surfaces of back teeth, where deep grooves make it easy for food and bacteria to get trapped even with regular brushing. Painted on in a quick, painless procedure, sealants act as a barrier against decay in those hard-to-clean areas. They're most commonly recommended for children's molars soon after they come in, though adults can benefit from them too." },
    { title: 'Sedation Dentistry', category: 'Oral Surgery',
      body: "Sedation dentistry uses medication to help patients feel calmer and more comfortable during a procedure, ranging from mild options like nitrous oxide to deeper oral or IV sedation for more involved treatment or significant dental anxiety. The right level of sedation depends on the procedure and the individual patient. It can make treatment far more manageable for people who might otherwise avoid necessary dental care out of fear or discomfort." },
    { title: 'Sinus Surgery', category: 'Oral Surgery',
      body: "When there isn't enough bone in the upper jaw to support a dental implant, a sinus lift can help by adding bone material beneath the sinus to build up the area. This creates a stronger foundation for the implant to be placed successfully. It's a well-established procedure for patients who want implants in the upper back jaw but don't currently have sufficient bone height there." },
    { title: 'Sleep Apnea in Children', category: 'Pediatric Dentistry',
      body: "Sleep apnea in children can look different than it does in adults — rather than daytime sleepiness, it often shows up as behavioral issues, trouble concentrating, or hyperactivity, since interrupted breathing disrupts restful sleep. Enlarged tonsils or adenoids are common contributing factors in kids. If you notice loud snoring, gasping, or restless sleep in your child, it's worth bringing up with both your pediatrician and dentist, since dental structure can play a role too." },
    { title: 'Smile Makeover', category: 'Cosmetic & General Dentistry',
      body: "A smile makeover combines two or more cosmetic treatments — such as whitening, bonding, veneers, or orthodontics — into a personalized plan designed around your specific goals for your smile. Rather than a single fix, it's a broader approach that considers tooth color, shape, alignment, and overall balance together. The exact combination of treatments varies widely from patient to patient, based on what each individual smile actually needs." },
    { title: 'Snoring and Sleep Apnea', category: 'Cosmetic & General Dentistry',
      body: "Snoring happens when relaxed tissue in the throat partially blocks the airway during sleep, creating that familiar vibrating sound — but persistent, loud snoring can sometimes be a sign of a more serious condition called sleep apnea, where breathing actually stops and starts repeatedly through the night. Some dentists offer custom oral appliances designed to help keep the airway more open during sleep as an alternative to other treatment options. A proper sleep evaluation is the best way to tell the difference between simple snoring and something that needs closer attention." },
    { title: 'Space Maintainers', category: 'Pediatric Dentistry',
      body: "Baby teeth do more than their job at the time — they also hold space for the permanent teeth waiting to come in beneath them. When a baby tooth is lost too early, neighboring teeth can drift into that open space, leaving too little room for the permanent tooth when it's ready to emerge. A space maintainer, a small custom appliance, holds that spot open until the adult tooth can come in where it belongs." },
    { title: 'Stress and Oral Habits', category: 'Oral Health',
      body: "Stress can show up in the mouth in ways people don't always connect to how they're feeling — teeth grinding and jaw clenching, often called bruxism, are common examples that tend to happen unconsciously, especially at night. Over time, these habits can wear down enamel, loosen fillings, and lead to jaw soreness or headaches. A custom nightguard, along with addressing the underlying stress where possible, can help protect teeth from ongoing damage." },
    { title: 'TMD', category: 'Cosmetic & General Dentistry',
      body: "The temporomandibular joints connect the jawbone to the skull and allow the smooth, hinge-like motion needed for talking, chewing, and yawning. When something disrupts how these joints or the surrounding muscles work, it's called temporomandibular disorder, or TMD, and it can cause jaw pain, clicking, or difficulty opening the mouth fully. Treatment approaches vary depending on the cause, ranging from a simple nightguard to more targeted therapy for the jaw joint itself." },
];

const ARTICLES_P7 = [
    { title: 'Teen Orthodontic Care', category: 'Orthodontics',
      body: "Most orthodontists recommend an evaluation for teens somewhere between ages 11 and 13, since that's often when issues like crowding, gaps, or bite problems become clearer as permanent teeth finish coming in. Treating these issues during the teen years can take advantage of the fact that the jaw and teeth are still relatively responsive to guided movement. Today's options range from traditional braces to clear aligners, giving teens more flexibility than in years past to fit treatment around their lifestyle." },
    { title: 'Teeth Whitening', category: 'Cosmetic & General Dentistry',
      body: "Over time, everyday habits like coffee, tea, red wine, and smoking can gradually dull a smile, along with the natural thinning of enamel that comes with age. Professional whitening treatments use a stronger concentration of whitening agent than what's available over the counter, often producing more noticeable, longer-lasting results in a shorter amount of time. Your dentist can help determine which whitening option — in-office or a custom take-home kit — best fits your smile and goals." },
    { title: 'Temporary Anchorage Devices', category: 'Orthodontics',
      body: "Temporary anchorage devices, sometimes called TADs or mini-implants, are small titanium screws placed temporarily in the jaw to provide extra, stable anchorage during certain orthodontic movements. Because they don't rely on other teeth for support, TADs can make some tooth movements more precise and predictable than traditional anchorage methods alone. Once treatment goals are met, the device is simply removed — it's not a permanent implant." },
    { title: 'Thumb Sucking', category: 'Pediatric Dentistry',
      body: "Thumb sucking is an extremely common habit that many babies develop even before birth, and most children naturally outgrow it between ages two and four. If the habit continues past that point, especially once permanent teeth start coming in, it can begin to affect how the teeth and jaw develop. Gentle encouragement, positive reinforcement, and support from your pediatric dentist can help a child transition away from the habit when it's time." },
    { title: 'Thumb and Finger Appliances', category: 'Orthodontics',
      body: "When a thumb or finger sucking habit persists past the age it typically resolves on its own, an orthodontic appliance can serve as a gentle reminder that helps break the pattern. These small devices are custom-fit and generally well tolerated, working passively rather than through discomfort. They're typically recommended only after other, less involved approaches haven't been successful on their own." },
    { title: 'Tooth Contouring', category: 'Cosmetic & General Dentistry',
      body: "Tooth contouring, sometimes called enamel shaping, gently reshapes small imperfections — like a slightly uneven edge or a minor overlap — by removing tiny amounts of enamel to create a more balanced look. It's typically quick, painless, and doesn't require anesthesia, making it one of the more conservative cosmetic options available. Because it only works for minor adjustments, more significant changes usually call for a different treatment like bonding or veneers." },
    { title: 'Tooth Decay Prevention', category: 'Cosmetic & General Dentistry',
      body: "Tooth decay begins when bacteria in the mouth feed on sugars and starches, producing acid that gradually wears away enamel and eventually creates a cavity. Preventing decay comes down to a few consistent habits: brushing and flossing daily, limiting frequent sugary or starchy snacking, and keeping up with regular dental checkups where early decay can be caught before it spreads. Fluoride, whether from toothpaste or a professional treatment, adds an extra layer of protection along the way." },
    { title: 'Tooth Pain', category: 'Emergency Care',
      body: "Tooth pain is the body's way of signaling that something needs attention, and it shouldn't be ignored — common causes range from decay and infection to a cracked tooth or gum disease. The location and type of pain, whether sharp, throbbing, or triggered by hot and cold, can offer clues about what's causing it, though a dental exam is needed for a real diagnosis. If pain is severe, persistent, or accompanied by swelling or fever, it's worth being seen promptly rather than waiting it out." },
    { title: 'Tooth Sensitivity', category: 'Endodontics',
      body: "Tooth sensitivity — that sharp, brief discomfort from hot, cold, sweet, or acidic foods — usually happens when the protective enamel has thinned or gum recession has exposed the more sensitive layer underneath. Causes range from aggressive brushing to teeth grinding to untreated decay. A desensitizing toothpaste can help with mild cases, but sensitivity that's new, worsening, or localized to one tooth is worth having evaluated, since it can point to a more specific underlying issue." },
    { title: 'Tooth-Colored Fillings', category: 'Cosmetic & General Dentistry',
      body: "Tooth-colored fillings use a composite resin material that's shaded to blend with your natural enamel, making them far less noticeable than traditional metal fillings. Beyond appearance, the material bonds directly to the tooth, which can mean less removal of healthy tooth structure during placement compared to some older filling types. They work well for small to medium cavities as well as minor chips or wear." },
    { title: 'Toothpaste', category: 'Oral Hygiene',
      body: "Most toothpastes contain fluoride, which helps strengthen enamel and make it more resistant to the acid that causes decay, but beyond that, formulas vary quite a bit — some target sensitivity, others focus on whitening, tartar control, or gum health. The right choice depends on your specific needs, and what works well for one person isn't necessarily the best fit for another. If you're not sure which type suits you, it's worth asking your dentist for a recommendation at your next visit." },
    { title: 'Traumatic Dental Injuries', category: 'Emergency Care',
      body: "Traumatic dental injuries — a knocked-out, chipped, or displaced tooth — happen most often in children and teens, though anyone can experience one from a fall, sports impact, or accident. How quickly you act can make a real difference, especially for a completely knocked-out tooth, where getting to a dentist within the first hour or so gives the best chance of saving it. Rinsing the area gently and controlling bleeding with clean gauze while you head in can help in the meantime." },
    { title: 'Types of Appliances', category: 'Orthodontics',
      body: "Beyond traditional braces, orthodontic treatment can involve a range of supporting appliances — elastics that help correct bite alignment, springs that create space between teeth, or expanders that gradually widen the jaw. Which appliances are used depends entirely on what a specific case needs to achieve. Your orthodontist will explain the purpose of any appliance recommended for your treatment plan and how it fits into the overall timeline." },
    { title: 'Types of Braces', category: 'Orthodontics',
      body: "Traditional metal braces remain one of the most common and affordable ways to straighten teeth, using brackets and archwires to gradually guide teeth into place. Other options, like ceramic braces or clear aligners, offer a less visible alternative for patients who prefer a more discreet look, though not every case is suited to every option. An orthodontic consultation is the best way to determine which type of braces fits your specific bite and alignment needs." },
    { title: 'Ultrasonic Cleanings', category: 'Periodontal Therapy',
      body: "Ultrasonic cleanings use a handheld device that vibrates at high speed to break up and remove plaque and tartar more efficiently than manual scraping alone. The vibration, combined with a light water spray, helps dislodge buildup even in areas that are harder to reach with traditional tools. Many patients find ultrasonic cleanings more comfortable and faster than fully manual cleanings, especially when there's a significant amount of tartar to remove." },
    { title: 'Veneers', category: 'Cosmetic & General Dentistry',
      body: "Veneers are thin, custom-made shells — typically porcelain — bonded to the front surface of a tooth to improve its color, shape, or alignment. They're often used to address chips, stains, gaps, or minor misalignment that other treatments might not fully resolve. Because a small amount of enamel is usually removed to fit the veneer properly, the change is considered permanent, so it's a decision worth discussing thoroughly with your dentist first." },
];

const ARTICLES_P8 = [
    { title: 'Whitening Traumatized Teeth', category: 'Endodontics',
      body: "A tooth that's experienced trauma — from an injury, a past root canal, or nerve damage — can sometimes darken over time, since internal changes affect how light reflects through the tooth differently than standard surface staining. Because the discoloration originates from inside the tooth, standard over-the-counter whitening usually isn't effective on its own. Your dentist can evaluate the cause and recommend an approach suited specifically to a traumatized tooth, which may differ from routine cosmetic whitening." },
    { title: 'Wisdom Teeth Removal', category: 'Oral Surgery',
      body: "Wisdom teeth, the last molars to come in, typically emerge sometime between ages 17 and 25 — and for many people, there simply isn't enough room in the jaw for them to erupt properly. When they come in at an angle, get stuck below the gumline, or crowd neighboring teeth, they're considered impacted, which is one of the most common reasons for extraction. Not every wisdom tooth needs to come out, but regular checkups help track how they're developing and whether removal is the right call." },
    { title: "Your Child's First Dental Appointment", category: 'Pediatric Dentistry',
      body: "Most dentists recommend scheduling a child's first dental visit shortly after their first tooth appears, generally by their first birthday. That first appointment is usually brief and low-key, focused more on helping your child feel comfortable in the dental chair than on any actual treatment. Starting early helps build a positive association with dental visits that carries forward as your child grows." },
    { title: "Your Child's First Teeth", category: 'Pediatric Dentistry',
      body: "A baby's first tooth is an exciting milestone, and it's worth knowing that these primary teeth need just as much care as the permanent teeth that follow, even though they'll eventually fall out on their own. Gently cleaning gums before teeth even emerge, then brushing with a small, soft-bristled brush once teeth appear, helps establish good habits early. Baby teeth also hold space for permanent teeth, so keeping them healthy matters more than many parents realize." },
    { title: 'Your First Orthodontic Visit', category: 'Orthodontics',
      body: "Knowing what to expect can make a first orthodontic consultation feel a lot less uncertain. Typically, the visit includes a review of your teeth and bite, some images or scans to get a clear picture of your alignment, and a conversation about treatment options and timeline if orthodontic care is recommended. It's also a good opportunity to ask about cost and financing, since most orthodontic offices are used to walking new patients through those details." },
];

const EDU_ALL_ARTICLES = [].concat(ARTICLES_P1, ARTICLES_P2, ARTICLES_P3, ARTICLES_P4, ARTICLES_P5, ARTICLES_P6, ARTICLES_P7, ARTICLES_P8);

const EducationArticles = (() => {
  const list = document.getElementById('eduArticles');
  const catList = document.getElementById('eduCatList');
  if (!list || !catList) return null;

  const ARTICLES = ARTICLES_P1;

  const HASH_TO_CATEGORY = {
    'educational-videos': 'Educational Videos',
    'cosmetic-general-dentistry': 'Cosmetic & General Dentistry',
    'emergency-care': 'Emergency Care',
    'endodontics': 'Endodontics',
    'implant-dentistry': 'Implant Dentistry',
    'oral-health': 'Oral Health',
    'oral-hygiene': 'Oral Hygiene',
    'oral-surgery': 'Oral Surgery',
    'orthodontics': 'Orthodontics',
    'pediatric-dentistry': 'Pediatric Dentistry',
    'periodontal-therapy': 'Periodontal Therapy',
    'technology': 'Technology',
  };

  const VIDEO_TABS = [
    { key: 'dentistry', label: 'Dentistry', heading: 'General &amp; Restorative Dentistry',
      body: "General dentistry covers the everyday care that keeps your mouth healthy — routine exams and cleanings, fillings for cavities, crowns for damaged teeth, and root canals when a tooth's inner pulp becomes infected. It's the foundation of dental care most patients rely on year after year, catching small problems before they turn into bigger ones.",
      images: [
        { src: 'assets/img/dentistry.png', caption: 'Preventive Care' },
        { src: 'assets/img/dentistry 2.png', caption: 'Restorative Treatment' },
        { src: 'assets/img/dentistry 3.png', caption: 'Routine Exams' },
      ] },
    { key: 'cosmetic', label: 'Cosmetic', heading: 'Cosmetic Dentistry',
      body: "Cosmetic dentistry focuses on the appearance of your smile, from teeth whitening and bonding for minor imperfections to veneers and full smile makeovers for more significant changes. These treatments are often paired with routine dental care, since a healthy foundation is the starting point for any cosmetic work.",
      images: [
        { src: 'assets/img/cosmetic.png', caption: 'Cosmetic Treatments' },
      ] },
    { key: 'orthodontics', label: 'Orthodontics', heading: 'Orthodontics',
      body: "Orthodontic treatment straightens teeth and corrects bite issues using braces, clear aligners, or other guided appliances. Beyond appearance, properly aligned teeth are generally easier to clean and less prone to uneven wear, which is part of why orthodontic evaluations are recommended for both children and adults.",
      images: [
        { src: 'assets/img/orthodontic 2.png', caption: 'Braces &amp; Aligners' },
        { src: 'assets/img/orthodontic problems.png', caption: 'Bite Correction' },
      ] },
    { key: 'kids', label: 'Kids', heading: "Kids' Dental Health",
      body: "Pediatric dental care is built around a child's changing needs, from their very first visit through the arrival of permanent teeth. Establishing good habits early — regular checkups, proper brushing, and a comfortable relationship with the dentist — helps set kids up for a lifetime of healthy smiles.",
      images: [
        { src: 'assets/img/kids.jpg', caption: "Kids' Dental Care" },
      ] },
  ];

  function videoThumbsMarkup(images) {
    if (!images || !images.length) return '';
    return `
      <div class="edu-video-thumbs">
        ${images.map((img) => `
          <figure class="edu-video-thumb">
            <img src="${img.src}" alt="${img.caption}" loading="lazy">
            <figcaption>${img.caption}</figcaption>
          </figure>
        `).join('')}
      </div>
    `;
  }

  function videoTabsMarkup() {
    return `
      <div class="edu-video-tabs">
        <div class="edu-video-tabbar" role="tablist">
          ${VIDEO_TABS.map((t, i) => `<button type="button" class="edu-video-tab${i === 0 ? ' active' : ''}" data-tab="${t.key}">${t.label}</button>`).join('')}
        </div>
        ${VIDEO_TABS.map((t, i) => `
          <div class="edu-video-panel" data-panel="${t.key}"${i === 0 ? '' : ' hidden'}>
            ${videoThumbsMarkup(t.images)}
            <h3>${t.heading}</h3>
            <p>${t.body}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  function render(category) {
    const pagination = document.getElementById('eduPagination');
    const moreNote = document.getElementById('eduMoreNote');
    if (pagination) pagination.style.display = category === 'all' ? '' : 'none';
    if (moreNote) moreNote.style.display = category === 'all' ? '' : 'none';
    if (category === 'Educational Videos') {
      list.innerHTML = videoTabsMarkup();
      return;
    }
    const items = category === 'all' ? ARTICLES : EDU_ALL_ARTICLES.filter((a) => a.category === category);
    if (!items.length) {
      list.innerHTML = '<p class="edu-empty">No articles in this category yet. Call our office with any question in the meantime.</p>';
      return;
    }
    list.innerHTML = items.map((a) => `
      <div class="edu-article-item">
        <h3>${a.title}</h3>
        <span class="edu-cat-tag">Category: ${a.category}</span>
        <p class="edu-body">${a.body}</p>
      </div>
    `).join('');
  }

  list.addEventListener('click', (event) => {
    const tabBtn = event.target.closest('.edu-video-tab');
    if (!tabBtn) return;
    const key = tabBtn.dataset.tab;
    list.querySelectorAll('.edu-video-tab').forEach((b) => b.classList.toggle('active', b === tabBtn));
    list.querySelectorAll('.edu-video-panel').forEach((p) => {
      p.hidden = p.dataset.panel !== key;
    });
  });

  const buttons = Array.from(catList.querySelectorAll('.edu-cat'));
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.category);
    });
  });

  const initialCategory = HASH_TO_CATEGORY[window.location.hash.replace('#', '')];
  if (initialCategory) {
    const match = buttons.find((b) => b.dataset.category === initialCategory);
    if (match) {
      buttons.forEach((b) => b.classList.remove('active'));
      match.classList.add('active');
      render(initialCategory);
    } else {
      render('all');
    }
  } else {
    render('all');
  }

  return { render };
})();

/**
 * Patient education articles (page 2 of 8): same pattern as page 1, with its
 * own original article set. No-ops if the page-2 list isn't present.
 */
const EducationArticlesPage2 = (() => {
  const list = document.getElementById('eduArticles2');
  const catList = document.getElementById('eduCatList2');
  if (!list || !catList) return null;

  const ARTICLES = ARTICLES_P2;

  const HASH_TO_CATEGORY = {
    'educational-videos': 'Educational Videos',
    'cosmetic-general-dentistry': 'Cosmetic & General Dentistry',
    'emergency-care': 'Emergency Care',
    'endodontics': 'Endodontics',
    'implant-dentistry': 'Implant Dentistry',
    'oral-health': 'Oral Health',
    'oral-hygiene': 'Oral Hygiene',
    'oral-surgery': 'Oral Surgery',
    'orthodontics': 'Orthodontics',
    'pediatric-dentistry': 'Pediatric Dentistry',
    'periodontal-therapy': 'Periodontal Therapy',
    'technology': 'Technology',
  };

  function render(category) {
    const pagination = document.getElementById('eduPagination');
    const moreNote = document.getElementById('eduMoreNote');
    if (pagination) pagination.style.display = category === 'all' ? '' : 'none';
    if (moreNote) moreNote.style.display = category === 'all' ? '' : 'none';
    const items = category === 'all' ? ARTICLES : EDU_ALL_ARTICLES.filter((a) => a.category === category);
    if (!items.length) {
      list.innerHTML = '<p class="edu-empty">No articles in this category yet. Call our office with any question in the meantime.</p>';
      return;
    }
    list.innerHTML = items.map((a) => `
      <div class="edu-article-item">
        <h3>${a.title}</h3>
        <span class="edu-cat-tag">Category: ${a.category}</span>
        <p class="edu-body">${a.body}</p>
      </div>
    `).join('');
  }

  const buttons = Array.from(catList.querySelectorAll('.edu-cat'));
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.category);
    });
  });

  const initialCategory = HASH_TO_CATEGORY[window.location.hash.replace('#', '')];
  if (initialCategory) {
    const match = buttons.find((b) => b.dataset.category === initialCategory);
    if (match) {
      buttons.forEach((b) => b.classList.remove('active'));
      match.classList.add('active');
      render(initialCategory);
    } else {
      render('all');
    }
  } else {
    render('all');
  }

  return { render };
})();

/**
 * Patient education articles (page 3 of 8): same pattern as pages 1–2, with
 * its own original article set. No-ops if the page-3 list isn't present.
 */
const EducationArticlesPage3 = (() => {
  const list = document.getElementById('eduArticles3');
  const catList = document.getElementById('eduCatList3');
  if (!list || !catList) return null;

  const ARTICLES = ARTICLES_P3;

  const HASH_TO_CATEGORY = {
    'educational-videos': 'Educational Videos',
    'cosmetic-general-dentistry': 'Cosmetic & General Dentistry',
    'emergency-care': 'Emergency Care',
    'endodontics': 'Endodontics',
    'implant-dentistry': 'Implant Dentistry',
    'oral-health': 'Oral Health',
    'oral-hygiene': 'Oral Hygiene',
    'oral-surgery': 'Oral Surgery',
    'orthodontics': 'Orthodontics',
    'pediatric-dentistry': 'Pediatric Dentistry',
    'periodontal-therapy': 'Periodontal Therapy',
    'technology': 'Technology',
  };

  function render(category) {
    const pagination = document.getElementById('eduPagination');
    const moreNote = document.getElementById('eduMoreNote');
    if (pagination) pagination.style.display = category === 'all' ? '' : 'none';
    if (moreNote) moreNote.style.display = category === 'all' ? '' : 'none';
    const items = category === 'all' ? ARTICLES : EDU_ALL_ARTICLES.filter((a) => a.category === category);
    if (!items.length) {
      list.innerHTML = '<p class="edu-empty">No articles in this category yet. Call our office with any question in the meantime.</p>';
      return;
    }
    list.innerHTML = items.map((a) => `
      <div class="edu-article-item">
        <h3>${a.title}</h3>
        <span class="edu-cat-tag">Category: ${a.category}</span>
        <p class="edu-body">${a.body}</p>
      </div>
    `).join('');
  }

  const buttons = Array.from(catList.querySelectorAll('.edu-cat'));
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.category);
    });
  });

  const initialCategory = HASH_TO_CATEGORY[window.location.hash.replace('#', '')];
  if (initialCategory) {
    const match = buttons.find((b) => b.dataset.category === initialCategory);
    if (match) {
      buttons.forEach((b) => b.classList.remove('active'));
      match.classList.add('active');
      render(initialCategory);
    } else {
      render('all');
    }
  } else {
    render('all');
  }

  return { render };
})();

/**
 * Patient education articles (page 4 of 8): same pattern as pages 1–3, with
 * its own original article set. No-ops if the page-4 list isn't present.
 */
const EducationArticlesPage4 = (() => {
  const list = document.getElementById('eduArticles4');
  const catList = document.getElementById('eduCatList4');
  if (!list || !catList) return null;

  const ARTICLES = ARTICLES_P4;

  const HASH_TO_CATEGORY = {
    'educational-videos': 'Educational Videos',
    'cosmetic-general-dentistry': 'Cosmetic & General Dentistry',
    'emergency-care': 'Emergency Care',
    'endodontics': 'Endodontics',
    'implant-dentistry': 'Implant Dentistry',
    'oral-health': 'Oral Health',
    'oral-hygiene': 'Oral Hygiene',
    'oral-surgery': 'Oral Surgery',
    'orthodontics': 'Orthodontics',
    'pediatric-dentistry': 'Pediatric Dentistry',
    'periodontal-therapy': 'Periodontal Therapy',
    'technology': 'Technology',
  };

  function render(category) {
    const pagination = document.getElementById('eduPagination');
    const moreNote = document.getElementById('eduMoreNote');
    if (pagination) pagination.style.display = category === 'all' ? '' : 'none';
    if (moreNote) moreNote.style.display = category === 'all' ? '' : 'none';
    const items = category === 'all' ? ARTICLES : EDU_ALL_ARTICLES.filter((a) => a.category === category);
    if (!items.length) {
      list.innerHTML = '<p class="edu-empty">No articles in this category yet. Call our office with any question in the meantime.</p>';
      return;
    }
    list.innerHTML = items.map((a) => `
      <div class="edu-article-item">
        <h3>${a.title}</h3>
        <span class="edu-cat-tag">Category: ${a.category}</span>
        <p class="edu-body">${a.body}</p>
      </div>
    `).join('');
  }

  const buttons = Array.from(catList.querySelectorAll('.edu-cat'));
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.category);
    });
  });

  const initialCategory = HASH_TO_CATEGORY[window.location.hash.replace('#', '')];
  if (initialCategory) {
    const match = buttons.find((b) => b.dataset.category === initialCategory);
    if (match) {
      buttons.forEach((b) => b.classList.remove('active'));
      match.classList.add('active');
      render(initialCategory);
    } else {
      render('all');
    }
  } else {
    render('all');
  }

  return { render };
})();

/**
 * Patient education articles (page 5 of 8): same pattern as pages 1–4, with
 * its own original article set. No-ops if the page-5 list isn't present.
 */
const EducationArticlesPage5 = (() => {
  const list = document.getElementById('eduArticles5');
  const catList = document.getElementById('eduCatList5');
  if (!list || !catList) return null;

  const ARTICLES = ARTICLES_P5;

  const HASH_TO_CATEGORY = {
    'educational-videos': 'Educational Videos',
    'cosmetic-general-dentistry': 'Cosmetic & General Dentistry',
    'emergency-care': 'Emergency Care',
    'endodontics': 'Endodontics',
    'implant-dentistry': 'Implant Dentistry',
    'oral-health': 'Oral Health',
    'oral-hygiene': 'Oral Hygiene',
    'oral-surgery': 'Oral Surgery',
    'orthodontics': 'Orthodontics',
    'pediatric-dentistry': 'Pediatric Dentistry',
    'periodontal-therapy': 'Periodontal Therapy',
    'technology': 'Technology',
  };

  function render(category) {
    const pagination = document.getElementById('eduPagination');
    const moreNote = document.getElementById('eduMoreNote');
    if (pagination) pagination.style.display = category === 'all' ? '' : 'none';
    if (moreNote) moreNote.style.display = category === 'all' ? '' : 'none';
    const items = category === 'all' ? ARTICLES : EDU_ALL_ARTICLES.filter((a) => a.category === category);
    if (!items.length) {
      list.innerHTML = '<p class="edu-empty">No articles in this category yet. Call our office with any question in the meantime.</p>';
      return;
    }
    list.innerHTML = items.map((a) => `
      <div class="edu-article-item">
        <h3>${a.title}</h3>
        <span class="edu-cat-tag">Category: ${a.category}</span>
        <p class="edu-body">${a.body}</p>
      </div>
    `).join('');
  }

  const buttons = Array.from(catList.querySelectorAll('.edu-cat'));
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.category);
    });
  });

  const initialCategory = HASH_TO_CATEGORY[window.location.hash.replace('#', '')];
  if (initialCategory) {
    const match = buttons.find((b) => b.dataset.category === initialCategory);
    if (match) {
      buttons.forEach((b) => b.classList.remove('active'));
      match.classList.add('active');
      render(initialCategory);
    } else {
      render('all');
    }
  } else {
    render('all');
  }

  return { render };
})();

/**
 * Patient education articles (page 6 of 8): same pattern as pages 1–5, with
 * its own original article set. No-ops if the page-6 list isn't present.
 */
const EducationArticlesPage6 = (() => {
  const list = document.getElementById('eduArticles6');
  const catList = document.getElementById('eduCatList6');
  if (!list || !catList) return null;

  const ARTICLES = ARTICLES_P6;

  const HASH_TO_CATEGORY = {
    'educational-videos': 'Educational Videos',
    'cosmetic-general-dentistry': 'Cosmetic & General Dentistry',
    'emergency-care': 'Emergency Care',
    'endodontics': 'Endodontics',
    'implant-dentistry': 'Implant Dentistry',
    'oral-health': 'Oral Health',
    'oral-hygiene': 'Oral Hygiene',
    'oral-surgery': 'Oral Surgery',
    'orthodontics': 'Orthodontics',
    'pediatric-dentistry': 'Pediatric Dentistry',
    'periodontal-therapy': 'Periodontal Therapy',
    'technology': 'Technology',
  };

  function render(category) {
    const pagination = document.getElementById('eduPagination');
    const moreNote = document.getElementById('eduMoreNote');
    if (pagination) pagination.style.display = category === 'all' ? '' : 'none';
    if (moreNote) moreNote.style.display = category === 'all' ? '' : 'none';
    const items = category === 'all' ? ARTICLES : EDU_ALL_ARTICLES.filter((a) => a.category === category);
    if (!items.length) {
      list.innerHTML = '<p class="edu-empty">No articles in this category yet. Call our office with any question in the meantime.</p>';
      return;
    }
    list.innerHTML = items.map((a) => `
      <div class="edu-article-item">
        <h3>${a.title}</h3>
        <span class="edu-cat-tag">Category: ${a.category}</span>
        <p class="edu-body">${a.body}</p>
      </div>
    `).join('');
  }

  const buttons = Array.from(catList.querySelectorAll('.edu-cat'));
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.category);
    });
  });

  const initialCategory = HASH_TO_CATEGORY[window.location.hash.replace('#', '')];
  if (initialCategory) {
    const match = buttons.find((b) => b.dataset.category === initialCategory);
    if (match) {
      buttons.forEach((b) => b.classList.remove('active'));
      match.classList.add('active');
      render(initialCategory);
    } else {
      render('all');
    }
  } else {
    render('all');
  }

  return { render };
})();

/**
 * Patient education articles (page 7 of 8): same pattern as pages 1–6, with
 * its own original article set. No-ops if the page-7 list isn't present.
 */
const EducationArticlesPage7 = (() => {
  const list = document.getElementById('eduArticles7');
  const catList = document.getElementById('eduCatList7');
  if (!list || !catList) return null;

  const ARTICLES = ARTICLES_P7;

  const HASH_TO_CATEGORY = {
    'educational-videos': 'Educational Videos',
    'cosmetic-general-dentistry': 'Cosmetic & General Dentistry',
    'emergency-care': 'Emergency Care',
    'endodontics': 'Endodontics',
    'implant-dentistry': 'Implant Dentistry',
    'oral-health': 'Oral Health',
    'oral-hygiene': 'Oral Hygiene',
    'oral-surgery': 'Oral Surgery',
    'orthodontics': 'Orthodontics',
    'pediatric-dentistry': 'Pediatric Dentistry',
    'periodontal-therapy': 'Periodontal Therapy',
    'technology': 'Technology',
  };

  function render(category) {
    const pagination = document.getElementById('eduPagination');
    const moreNote = document.getElementById('eduMoreNote');
    if (pagination) pagination.style.display = category === 'all' ? '' : 'none';
    if (moreNote) moreNote.style.display = category === 'all' ? '' : 'none';
    const items = category === 'all' ? ARTICLES : EDU_ALL_ARTICLES.filter((a) => a.category === category);
    if (!items.length) {
      list.innerHTML = '<p class="edu-empty">No articles in this category yet. Call our office with any question in the meantime.</p>';
      return;
    }
    list.innerHTML = items.map((a) => `
      <div class="edu-article-item">
        <h3>${a.title}</h3>
        <span class="edu-cat-tag">Category: ${a.category}</span>
        <p class="edu-body">${a.body}</p>
      </div>
    `).join('');
  }

  const buttons = Array.from(catList.querySelectorAll('.edu-cat'));
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.category);
    });
  });

  const initialCategory = HASH_TO_CATEGORY[window.location.hash.replace('#', '')];
  if (initialCategory) {
    const match = buttons.find((b) => b.dataset.category === initialCategory);
    if (match) {
      buttons.forEach((b) => b.classList.remove('active'));
      match.classList.add('active');
      render(initialCategory);
    } else {
      render('all');
    }
  } else {
    render('all');
  }

  return { render };
})();

/**
 * Patient education articles (page 8 of 8, final page): same pattern as
 * pages 1–7, with its own original article set. No-ops if the page-8 list
 * isn't present.
 */
const EducationArticlesPage8 = (() => {
  const list = document.getElementById('eduArticles8');
  const catList = document.getElementById('eduCatList8');
  if (!list || !catList) return null;

  const ARTICLES = ARTICLES_P8;

  const HASH_TO_CATEGORY = {
    'educational-videos': 'Educational Videos',
    'cosmetic-general-dentistry': 'Cosmetic & General Dentistry',
    'emergency-care': 'Emergency Care',
    'endodontics': 'Endodontics',
    'implant-dentistry': 'Implant Dentistry',
    'oral-health': 'Oral Health',
    'oral-hygiene': 'Oral Hygiene',
    'oral-surgery': 'Oral Surgery',
    'orthodontics': 'Orthodontics',
    'pediatric-dentistry': 'Pediatric Dentistry',
    'periodontal-therapy': 'Periodontal Therapy',
    'technology': 'Technology',
  };

  function render(category) {
    const pagination = document.getElementById('eduPagination');
    const moreNote = document.getElementById('eduMoreNote');
    if (pagination) pagination.style.display = category === 'all' ? '' : 'none';
    if (moreNote) moreNote.style.display = category === 'all' ? '' : 'none';
    const items = category === 'all' ? ARTICLES : EDU_ALL_ARTICLES.filter((a) => a.category === category);
    if (!items.length) {
      list.innerHTML = '<p class="edu-empty">No articles in this category yet. Call our office with any question in the meantime.</p>';
      return;
    }
    list.innerHTML = items.map((a) => `
      <div class="edu-article-item">
        <h3>${a.title}</h3>
        <span class="edu-cat-tag">Category: ${a.category}</span>
        <p class="edu-body">${a.body}</p>
      </div>
    `).join('');
  }

  const buttons = Array.from(catList.querySelectorAll('.edu-cat'));
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.category);
    });
  });

  const initialCategory = HASH_TO_CATEGORY[window.location.hash.replace('#', '')];
  if (initialCategory) {
    const match = buttons.find((b) => b.dataset.category === initialCategory);
    if (match) {
      buttons.forEach((b) => b.classList.remove('active'));
      match.classList.add('active');
      render(initialCategory);
    } else {
      render('all');
    }
  } else {
    render('all');
  }

  return { render };
})();

/**
 * Smile gallery lightbox: clicking a gallery thumbnail opens its full-size
 * image in an overlay. No-ops if no gallery markup is present.
 */
(() => {
  const items = document.querySelectorAll('[data-lightbox]');
  const overlay = document.getElementById('lightbox');
  if (!items.length || !overlay) return;

  const img = overlay.querySelector('img');
  const closeBtn = overlay.querySelector('.lightbox-close');

  function open(src, alt) {
    img.src = src;
    img.alt = alt;
    overlay.classList.add('open');
  }

  function close() {
    overlay.classList.remove('open');
    img.src = '';
  }

  items.forEach((item) => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      open(item.href, item.querySelector('img')?.alt || '');
    });
  });

  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
})();
