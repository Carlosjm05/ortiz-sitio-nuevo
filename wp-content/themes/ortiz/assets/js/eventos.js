/**
 * Analítica común (13-interacciones.md · Eventos GA4):
 * - Cada clic en un elemento con data-event se envía como evento GA4 con su data-ubicacion / data-proyecto.
 * - En /gracias/?f={formulario} (envíos sin JS) se envía generate_lead una vez por sesión.
 * - Quien llega con utm_* queda con la cookie de sesión «ortiz_utm» (el servidor también la pone; esto cubre las
 *   páginas que salen de una caché). Cada contacto la guarda al enviarse.
 * Si no hay gtag (la etiqueta de GA4 llega en la Fase 8 o va por Tag Manager), los eventos van a dataLayer.
 * Nunca se envían nombres, teléfonos, correos ni el texto de los mensajes de WhatsApp.
 */

const evento = (nombre, params = {}) => {
	if (typeof window.gtag === 'function') {
		window.gtag('event', nombre, params);
	} else {
		window.dataLayer = window.dataLayer || [];
		window.dataLayer.push({ event: nombre, ...params });
	}
};
window.ortizEvento = evento;

/* Clics con data-event */
document.addEventListener('click', (e) => {
	const el = e.target.closest && e.target.closest('[data-event]');
	if (!el) return;
	const params = { pagina: window.location.pathname };
	['ubicacion', 'proyecto', 'casa'].forEach((k) => { if (el.dataset[k]) params[k] = el.dataset[k]; });
	evento(el.dataset.event, params);
}, { capture: true });

/* generate_lead de los envíos sin JS (página de gracias) */
const buscar = new URLSearchParams(window.location.search);
const formulario = buscar.get('f');
if (formulario && /\/gracias\/?$/.test(window.location.pathname)) {
	const clave = 'ortiz_lead_' + formulario;
	let ya = false;
	try { ya = sessionStorage.getItem(clave) === '1'; sessionStorage.setItem(clave, '1'); } catch (err) { ya = false; }
	if (!ya) evento('generate_lead', { form_name: formulario.replace(/[^a-z_]/g, '') });
}

/* UTM de la visita (cookie de sesión) */
const utm = {};
['utm_source', 'utm_medium', 'utm_campaign'].forEach((k) => {
	const v = buscar.get(k);
	if (v) utm[k] = v.slice(0, 100);
});
if (Object.keys(utm).length) {
	const seguro = window.location.protocol === 'https:' ? '; Secure' : '';
	document.cookie = 'ortiz_utm=' + encodeURIComponent(JSON.stringify(utm)) + '; path=/; SameSite=Lax' + seguro;
}
