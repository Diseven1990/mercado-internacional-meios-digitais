'use strict';
const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#menu');
function closeMenu() { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
toggle.addEventListener('click', () => { const open = menu.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.classList.contains('open')) { closeMenu(); toggle.focus(); } });
const contacts = window.courseContacts;
const privacyEmail = document.querySelector('#privacy-email');
if (privacyEmail) {
  privacyEmail.href = 'mailto:' + (contacts.privacyEmail || contacts.email);
  privacyEmail.textContent = contacts.privacyEmail || contacts.email;
}
const whatsapp = document.querySelector('#whatsapp');
const question = 'Olá! Gostaria de esclarecer uma dúvida sobre o percurso Mercado Internacional e os Meios Digitais, no âmbito do Lisboa 2030.';
whatsapp.href = 'https://wa.me/' + contacts.whatsapp + '?text=' + encodeURIComponent(question);
whatsapp.hidden = false;

const form = document.querySelector('#application');
const submit = document.querySelector('#signup-button');
const info = document.querySelector('#send-info');
const result = document.querySelector('#send-result');
let direct = false;

async function chooseDelivery() {
  if (contacts.endpoint && location.protocol.startsWith('http')) {
    try {
      const response = await fetch(contacts.endpoint, { cache: 'no-store', signal: AbortSignal.timeout(3500) });
      direct = response.ok && (await response.json()).ready === true;
    } catch { /* Ficheiros estáticos usam o cliente de email do candidato. */ }
  }
  info.textContent = direct ? 'Os contactos serão enviados por email à equipa responsável pela pré-inscrição.' :
    'Reveja e envie a pré-inscrição na sua aplicação de email.';
  submit.textContent = direct ? 'Enviar pré-inscrição' : 'Preparar email de pré-inscrição ↗';
  submit.disabled = false;
}
chooseDelivery();

form.addEventListener('submit', async event => {
  event.preventDefault();
  const nameInput = document.querySelector('#app-name');
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  const email = document.querySelector('#app-email').value.trim();
  const subject = 'Pré-inscrição · Mercado Internacional e os Meios Digitais';
  if (!direct) {
    const body = ['Olá,', '', 'Pretendo pré-inscrever-me no percurso Mercado Internacional e os Meios Digitais.',
      'Nome: ' + name, 'Email de contacto: ' + email].join('\r\n');
    location.href = 'mailto:' + contacts.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    result.textContent = 'Conclua o envio na sua aplicação de email. Se esta não abrir, envie o seu nome e contacto para ' + contacts.email + '.';
    return;
  }
  submit.disabled = true;
  result.textContent = 'A enviar…';
  try {
    const response = await fetch(contacts.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }) });
    if (!response.ok || (await response.json()).accepted !== true) throw new Error('delivery');
    result.textContent = 'O serviço de email aceitou o pedido. A candidatura fica sujeita a validação.';
    form.reset();
  } catch {
    result.textContent = 'Não foi possível confirmar o envio. Pode contactar a equipa por email através de ' + contacts.email + '.';
  } finally { submit.disabled = false; }
});

// O botão flutuante dá lugar aos botões no conteúdo (não ao menu fixo).
(() => {
  const floating = document.querySelector('.floating-signup');
  const targets = [...document.querySelectorAll('.hero-main a[href="#pre-inscricao"], #signup-button')];
  if (!floating || !targets.length) return;
  let frame = 0;
  let docked = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function update() {
    frame = 0;
    const top = document.querySelector('header')?.getBoundingClientRect().bottom || 0;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const viewportWidth = document.documentElement.clientWidth;
    const target = targets.find(element => {
      const r = element.getBoundingClientRect();
      // Só cede lugar quando o botão está totalmente visível e utilizável.
      return r.width > 0 && r.height > 0 && r.top >= top + 8 &&
        r.bottom <= viewportHeight - 12 && r.left >= 0 && r.right <= viewportWidth;
    });
    const nextDocked = Boolean(target);
    if (nextDocked === docked) return;
    docked = nextDocked;
    // Cancelar uma transição anterior permite inverter o movimento ao fazer scroll.
    floating.getAnimations().forEach(animation => animation.cancel());
    if (docked) {
      const from = floating.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const dx = to.left + to.width / 2 - from.left - from.width / 2;
      const dy = to.top + to.height / 2 - from.top - from.height / 2;
      const hadFocus = document.activeElement === floating;
      floating.classList.add('is-docked');
      floating.setAttribute('aria-hidden', 'true');
      floating.setAttribute('tabindex', '-1');
      if (hadFocus) target.focus({ preventScroll: true });
      if (!reduceMotion.matches) floating.animate([
        { opacity: 1, transform: 'translate(0, 0) scale(1)' },
        { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(.85)` }
      ], { duration: 260, easing: 'cubic-bezier(.22,.61,.36,1)' });
    } else {
      floating.classList.remove('is-docked');
      floating.removeAttribute('aria-hidden');
      floating.removeAttribute('tabindex');
      if (!reduceMotion.matches) floating.animate([
        { opacity: 0, transform: 'translateY(8px) scale(.96)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], { duration: 200, easing: 'ease-out' });
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    targets.forEach(target => observer.observe(target));
  }
  update();
})();

// Entradas progressivas durante a leitura; o conteúdo começa sempre visível.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && typeof Element.prototype.animate === 'function') {
  const groups = '.criteria li, .simple-heading, .course-card, .simple-info h2, .faq, .signup-intro';
  const entryObserver = new IntersectionObserver(entries => {
    let delay = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entryObserver.unobserve(entry.target);
      if (motionPreference.matches) continue;
      entry.target.animate([
        { opacity: 0.15, transform: 'translateY(26px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 560, delay, fill: 'backwards', easing: 'cubic-bezier(.18,.72,.24,1)' });
      delay = Math.min(delay + 65, 195);
    }
  }, { threshold: 0.09 });
  document.querySelectorAll(groups).forEach(element => entryObserver.observe(element));
}

const portrait = document.querySelector('.hero-portrait');
if (portrait && CSS.supports('animation-timeline: view()')) {
  portrait.classList.add('scroll-portrait');
}
