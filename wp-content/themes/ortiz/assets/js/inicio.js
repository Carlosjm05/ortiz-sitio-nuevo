/**
 * Inicio: buscador de la portada, etapas de «Así te acompañamos» y pregunta rápida por WhatsApp.
 * Todo funciona sin JS (el buscador es un formulario GET a /buscar/, se ve la primera etapa y el botón
 * abre WhatsApp); esto lo mejora. Lógica de referencia: heroSearch, acSteps y setFaqAsk de Inicio Ortiz v2.dc.html.
 */

const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const curva = 'cubic-bezier(.2,.7,.2,1)';

/* Buscador: no manda los campos vacíos («Todos», «Más de $250M») para que la URL quede limpia. */
document.querySelectorAll('[data-buscador]').forEach((form) => {
	form.addEventListener('submit', () => {
		form.querySelectorAll('select').forEach((s) => { s.disabled = s.value === ''; });
		// Si el usuario vuelve con «atrás», los campos deben seguir activos.
		setTimeout(() => form.querySelectorAll('select').forEach((s) => { s.disabled = false; }), 0);
	});
});

/* Etapas: pestañas (clic, flechas, Inicio y Fin) que cambian la conversación del teléfono. */
document.querySelectorAll('[data-etapas]').forEach((zona) => {
	const tabs = [...zona.querySelectorAll('[role="tab"]')];
	const panel = (t) => document.getElementById(t.getAttribute('aria-controls'));
	const elegir = (tab, foco) => {
		tabs.forEach((t) => {
			const on = t === tab;
			t.setAttribute('aria-selected', String(on));
			t.tabIndex = on ? 0 : -1;
			const p = panel(t);
			if (!p) return;
			if (on && p.hidden) {
				p.hidden = false;
				if (!reducir() && p.animate) {
					[...p.children].forEach((m, i) => m.animate(
						[{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
						{ duration: 320, delay: i * 70, easing: curva, fill: 'backwards' }
					));
				}
			} else if (!on) {
				p.hidden = true;
			}
		});
		if (foco) tab.focus();
	};
	tabs.forEach((t, i) => {
		t.addEventListener('click', () => elegir(t, false));
		t.addEventListener('keydown', (e) => {
			const ir = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
			if (ir === undefined) return;
			e.preventDefault();
			elegir(tabs[(ir + tabs.length) % tabs.length], true);
		});
	});
});

/* Pregunta rápida: lo escrito aparece como mensaje y viaja en el enlace de WhatsApp. */
document.querySelectorAll('[data-chat-faq]').forEach((chat) => {
	const campo = chat.querySelector('[data-chat-faq-campo]');
	const eco = chat.querySelector('[data-chat-faq-eco]');
	const enviar = chat.querySelector('[data-chat-faq-enviar]');
	if (!campo || !enviar) return;
	const base = enviar.href.split('?')[0];
	const prefijo = enviar.dataset.prefijo || '';
	const actualizar = () => {
		const texto = campo.value.trim();
		enviar.href = base + '?text=' + encodeURIComponent((prefijo + ' ' + texto).trim());
		if (!eco) return;
		const antes = eco.hidden;
		eco.textContent = texto;
		eco.hidden = texto === '';
		if (antes && !eco.hidden && !reducir() && eco.animate) {
			eco.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: curva });
		}
	};
	campo.addEventListener('input', actualizar);
	// Enter envía, como en el chat.
	campo.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' && campo.value.trim() !== '') {
			e.preventDefault();
			enviar.click();
		}
	});
});
