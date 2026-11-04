/**
 * Contacto: vista previa en vivo del mensaje (asesor según el municipio), validación con el aviso del diseño
 * («Falta tu nombre, tu WhatsApp…»), envío con fetch y panel «Gracias», y día de hoy en el horario.
 * Sin JS el formulario va por admin-post y el horario marca el día según el servidor.
 * Lógica de referencia: ctPreview, cMiss, ctSubmit, ctDoneTxt y ctHorario de Contacto.dc.html.
 */

const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const curva = 'cubic-bezier(.2,.7,.2,1)';
const aparecer = (el) => { if (el && !reducir() && el.animate) el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: curva }); };
const reemplazar = (t, v) => Object.keys(v).reduce((s, k) => s.split('{' + k + '}').join(v[k]), t || '');

/* ───────── Formulario ───────── */
const form = document.querySelector('[data-cform]');
if (form) {
	let cfg = {};
	try { cfg = JSON.parse(form.querySelector('[data-cform-config]').textContent); } catch (e) { cfg = {}; }
	const textos = cfg.textos || {};
	const $ = (s) => form.querySelector(s);
	const campo = (n) => form.querySelector(`[data-c="${n}"]`);
	const elegido = (n) => { const r = form.querySelector(`input[name="${n}"]:checked`); return r ? r.value : ''; };
	const errorEl = $('[data-cerror]');
	const enviar = $('[data-cenviar]');
	const listo = document.querySelector('[data-listo]');
	const textoBoton = enviar ? enviar.textContent : '';

	const municipio = () => {
		const s = campo('municipio');
		return s ? { k: s.value, n: s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : '' } : { k: '', n: '' };
	};
	const asesor = () => (cfg.asesores || {})[municipio().k] || null;
	const primerNombre = () => (campo('nombre').value.trim().split(/\s+/)[0] || '');

	/* Vista previa en el teléfono */
	const vAvatar = document.querySelector('[data-vista-avatar]');
	const vNombre = document.querySelector('[data-vista-nombre]');
	const vZona = document.querySelector('[data-vista-zona]');
	const vSaludo = document.querySelector('[data-vista-saludo]');
	const vMsg = document.querySelector('[data-vista-msg]');
	let asesorPintado = '';
	const pintarVista = () => {
		if (!vMsg) return;
		const a = asesor();
		if (a && a.nombre + a.zona !== asesorPintado) {
			asesorPintado = a.nombre + a.zona;
			vNombre.textContent = a.nombre;
			vZona.textContent = a.zona;
			vSaludo.textContent = reemplazar(textos.saludo, { asesor: a.primer });
			vAvatar.replaceChildren();
			if (a.foto) { const img = document.createElement('img'); img.src = a.foto; img.alt = ''; vAvatar.append(img); } else vAvatar.textContent = a.ini;
		}
		const mensaje = campo('mensaje').value.trim();
		vMsg.textContent = reemplazar(textos.vista, {
			nombre: campo('nombre').value.trim() || '___',
			accion: (cfg.motivos || {})[elegido('motivo')] || '',
			municipio: municipio().n,
			mensaje: mensaje ? ' ' + mensaje : '',
			canal: elegido('canal').toLowerCase(),
			horario: elegido('horario').toLowerCase(),
		});
	};
	form.addEventListener('input', pintarVista);
	form.addEventListener('change', pintarVista);
	pintarVista();

	/* Validación: los mismos faltantes del diseño, en un solo aviso */
	const faltantes = () => {
		const f = [];
		if (campo('nombre').value.trim().length < 2) f.push('tu nombre');
		if (!/^3\d{9}$/.test(campo('telefono').value.replace(/\D/g, '').replace(/^57(?=3\d{9}$)/, ''))) f.push('tu WhatsApp');
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campo('correo').value.trim())) f.push('tu correo');
		if (!campo('acepto').checked) f.push('aceptar la política de datos');
		return f;
	};
	const mostrarError = (msg) => {
		errorEl.textContent = msg;
		errorEl.hidden = !msg;
		if (msg) aparecer(errorEl);
	};
	let intentado = false;
	form.addEventListener('input', () => {
		if (!intentado) return;
		const f = faltantes();
		mostrarError(f.length ? reemplazar(textos.falta, { lista: f.join(', ') }) : '');
	});

	/* Envío */
	const envio = cfg.envio || {};
	const publicar = async (datos) => {
		const res = await fetch(envio.url, { method: 'POST', body: datos, credentials: 'same-origin', headers: { 'X-WP-Nonce': envio.restNonce || '' } });
		let json = null;
		try { json = await res.json(); } catch (e) { json = null; }
		return { status: res.status, json };
	};
	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		intentado = true;
		const f = faltantes();
		if (f.length) {
			mostrarError(reemplazar(textos.falta, { lista: f.join(', ') }));
			const primero = { 'tu nombre': 'nombre', 'tu WhatsApp': 'telefono', 'tu correo': 'correo', 'aceptar la política de datos': 'acepto' }[f[0]];
			if (primero && campo(primero)) campo(primero).focus();
			return;
		}
		if (!envio.url) { form.submit(); return; }
		mostrarError('');
		enviar.disabled = true;
		enviar.textContent = 'Enviando…';
		const datos = new FormData(form);
		try {
			let res = await publicar(datos);
			const codigo = res.json ? (res.json.codigo || res.json.code) : '';
			if (res.status === 403 && (codigo === 'ortiz_nonce' || codigo === 'rest_cookie_invalid_nonce') && envio.nonceUrl) {
				const n = await (await fetch(envio.nonceUrl, { credentials: 'same-origin' })).json();
				envio.nonce = n.nonce;
				envio.restNonce = n.restNonce;
				datos.set('_ortiz_nonce', n.nonce);
				res = await publicar(datos);
			}
			if (!res.json || !res.json.ok) {
				mostrarError(res.json && res.json.msg ? res.json.msg : 'No pudimos enviar. Revisa tu conexión e inténtalo de nuevo.');
				return;
			}
			const a = asesor();
			const nombreAsesor = res.json.asesor || (a ? a.nombre : '');
			listo.querySelector('[data-listo-titulo]').textContent = reemplazar(textos.titulo, { nombre: primerNombre() }).replace(/\s+\./, '.');
			listo.querySelector('[data-listo-texto]').textContent = reemplazar(textos.listo, { asesor: nombreAsesor || 'Un asesor', canal: elegido('canal').toLowerCase(), horario: elegido('horario').toLowerCase() });
			const wa = listo.querySelector('[data-listo-wa]');
			if (res.json.wa) wa.href = res.json.wa;
			form.hidden = true;
			listo.hidden = false;
			aparecer(listo);
			listo.focus();
			if (window.ortizEvento) window.ortizEvento('generate_lead', { form_name: 'contacto' });
		} catch (err) {
			mostrarError('No pudimos enviar. Revisa tu conexión e inténtalo de nuevo.');
		} finally {
			enviar.disabled = false;
			enviar.textContent = textoBoton;
		}
	});

	/* «Otro mensaje»: vuelve al formulario con los datos de contacto y el mensaje vacío */
	const otro = document.querySelector('[data-otro]');
	if (otro) otro.addEventListener('click', () => {
		campo('mensaje').value = '';
		intentado = false;
		listo.hidden = true;
		form.hidden = false;
		aparecer(form);
		pintarVista();
		campo('mensaje').focus();
	});
}

/* ───────── Horario: el día de hoy según el visitante ───────── */
const horario = document.querySelector('[data-horario]');
if (horario) {
	const hoy = new Date().getDay();
	horario.querySelectorAll('[data-dias]').forEach((fila) => {
		const on = fila.dataset.dias.split(',').map(Number).includes(hoy);
		fila.classList.toggle('is-hoy', on);
		const marca = fila.querySelector('[data-hoy-txt]');
		if (marca) marca.hidden = !on;
	});
}
