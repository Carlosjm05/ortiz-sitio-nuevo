/**
 * «Cuéntanos qué buscas»: asistente de 6 pasos (datos → tipo → dónde → detalles → presupuesto → amenidades).
 * Valida los datos antes de avanzar, muestra solo las preguntas del tipo elegido, arma el resumen y el mensaje
 * de WhatsApp, y envía a /wp-json/ortiz/v1/busqueda (sin JS el formulario se envía igual por admin-post).
 * Lógica de referencia: aSteps / aNext / sendAlert de Proyectos.dc.html y Propiedades.dc.html.
 */

document.querySelectorAll('[data-asistente]').forEach((caja) => {
	let cfg = {};
	try {
		cfg = JSON.parse(caja.querySelector('[data-asistente-config]').textContent);
	} catch (e) {
		return;
	}
	const form = caja.querySelector('[data-asistente-form]');
	const pasos = [...caja.querySelectorAll('[data-paso]')];
	const navs = [...caja.querySelectorAll('[data-paso-nav]')];
	const titulo = caja.querySelector('[data-paso-titulo]');
	const pista = caja.querySelector('[data-paso-pista]');
	const error = caja.querySelector('[data-asistente-error]');
	const atras = caja.querySelector('[data-atras]');
	const enviarBtn = caja.querySelector('[data-enviar]');
	const listo = caja.querySelector('[data-asistente-listo]');
	const campo = (n) => form.elements[n];
	const errores = cfg.errores || {};
	const ultimo = pasos.length - 1;
	let actual = 0;

	const tipoElegido = () => {
		const r = form.querySelector('input[name="tipo"]:checked');
		return r ? { valor: r.value, kind: r.dataset.kind } : null;
	};
	const kindActual = () => {
		const t = tipoElegido();
		const primero = form.querySelector('input[name="tipo"]');
		return t ? t.kind : (primero ? primero.dataset.kind : '');
	};
	const nombre = () => String(campo('nombre').value || '').trim();
	const telDigitos = () => String(campo('telefono').value || '').replace(/\D/g, '');

	const avisar = (texto) => { if (error) error.textContent = texto || ''; };

	// Solo las preguntas del tipo elegido (Detalles, Presupuesto y Amenidades cambian según el tipo).
	const ponerKind = () => {
		const k = kindActual();
		caja.querySelectorAll('[data-de-tipo]').forEach((b) => b.classList.toggle('is-tipo', b.dataset.deTipo === k));
	};

	const pintar = (enfocar) => {
		pasos.forEach((p, i) => p.classList.toggle('is-activo', i === actual));
		navs.forEach((li, i) => {
			li.classList.toggle('is-actual', i === actual);
			li.classList.toggle('is-hecho', i < actual);
			const b = li.querySelector('[data-ir-paso]');
			if (b) {
				if (i === actual) b.setAttribute('aria-current', 'step');
				else b.removeAttribute('aria-current');
			}
		});
		const t = (cfg.pasos || [])[actual] || ['', ''];
		const elegido = tipoElegido();
		if (titulo) titulo.textContent = t[0];
		if (pista) pista.textContent = actual === 3 && elegido ? String(cfg.pistaTipo || '').replace('{tipo}', elegido.valor.toLowerCase()) : t[1];
		if (atras) atras.hidden = actual === 0;
		form.classList.toggle('is-ultimo', actual === ultimo);
		if (enfocar && titulo) {
			titulo.tabIndex = -1;
			titulo.focus({ preventScroll: true });
		}
	};

	const ir = (n, enfocar) => {
		const datosOk = nombre() && telDigitos().length >= 10;
		if (n > 0 && !datosOk) {
			actual = 0;
			avisar(!nombre() ? errores.nombre : errores.tel);
		} else if (n > 1 && !tipoElegido()) {
			actual = 1;
			avisar(cfg.errorTipo);
		} else {
			actual = Math.max(0, Math.min(ultimo, n));
			avisar('');
		}
		pintar(enfocar);
	};

	// Resumen como el del diseño: tipo, dónde, detalles distintos de «Cualquiera/Indiferente», presupuesto, pago, cuándo, amenidades y nota.
	const resumen = () => {
		const k = kindActual();
		const t = tipoElegido();
		const lineas = [];
		if (t) lineas.push('Tipo: ' + t.valor);
		const donde = [...form.querySelectorAll('input[name="donde[]"]:checked')].map((c) => c.value);
		if (donde.length) lineas.push('Dónde: ' + donde.join(', '));
		form.querySelectorAll('[data-paso="3"] [data-de-tipo="' + k + '"] select').forEach((s) => {
			if (s.selectedIndex > 0) {
				const etiqueta = s.closest('label').querySelector('.asistente__k');
				lineas.push((etiqueta ? etiqueta.textContent : '') + ': ' + s.value);
			}
		});
		const presupuesto = form.querySelector('[data-paso="4"] [data-de-tipo="' + k + '"] select');
		lineas.push('Presupuesto: ' + (presupuesto ? presupuesto.value : ''));
		lineas.push('Pago: ' + campo('pago').value);
		lineas.push('Cuándo: ' + campo('cuando').value);
		const amen = [...form.querySelectorAll('[data-paso="5"] [data-de-tipo="' + k + '"] input:checked')].map((c) => c.value);
		if (amen.length) lineas.push('Que tenga: ' + amen.join(', '));
		const nota = String(campo('nota').value || '').trim();
		if (nota) lineas.push('Nota: ' + nota);
		return lineas;
	};

	const publicar = async (datos) => {
		const envio = cfg.envio || {};
		const res = await fetch(envio.url, { method: 'POST', body: datos, credentials: 'same-origin', headers: { 'X-WP-Nonce': envio.restNonce || '' } });
		let json = null;
		try {
			json = await res.json();
		} catch (e) {
			json = null;
		}
		return { status: res.status, json };
	};

	const mostrarListo = (lineas) => {
		const n = nombre();
		caja.querySelector('[data-listo-titulo]').textContent = String(cfg.listo || '').replace('{nombre}', n);
		caja.querySelector('[data-listo-resumen]').textContent = lineas.join('\n');
		const wa = caja.querySelector('[data-listo-wa]');
		if (wa && cfg.wa) {
			const saludo = (cfg.saludo || 'Hola equipo Ortiz') + ', soy ' + n + '. Busco:\n' + lineas.join('\n');
			wa.href = cfg.wa.split('?')[0] + '?text=' + encodeURIComponent(saludo);
		}
		form.hidden = true;
		listo.hidden = false;
	};

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		// Enter en un campo antes del último paso avanza en vez de enviar.
		if (actual < ultimo) {
			ir(actual + 1, true);
			return;
		}
		if (!nombre() || telDigitos().length < 10) {
			avisar(!nombre() ? errores.nombreEnviar : errores.tel);
			const top = caja.getBoundingClientRect().top + window.scrollY - 100;
			window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
			return;
		}
		if (!tipoElegido()) {
			ir(1, true);
			return;
		}
		if (!cfg.envio || !cfg.envio.url) {
			form.submit();
			return;
		}
		const lineas = resumen();
		const datos = new FormData(form);
		enviarBtn.disabled = true;
		try {
			let res = await publicar(datos);
			// Página guardada en caché más de un día: se piden nonces nuevos y se reintenta una vez.
			const codigo = res.json ? (res.json.codigo || res.json.code) : '';
			if (res.status === 403 && (codigo === 'ortiz_nonce' || codigo === 'rest_cookie_invalid_nonce') && cfg.envio.nonceUrl) {
				const n = await (await fetch(cfg.envio.nonceUrl, { credentials: 'same-origin' })).json();
				cfg.envio.nonce = n.nonce;
				cfg.envio.restNonce = n.restNonce;
				datos.set('_ortiz_nonce', n.nonce);
				const oculto = form.querySelector('input[name="_ortiz_nonce"]');
				if (oculto) oculto.value = n.nonce;
				res = await publicar(datos);
			}
			if (res.json && res.json.ok) {
				avisar('');
				mostrarListo(lineas);
				if (window.ortizEvento) window.ortizEvento('generate_lead', { form_name: 'busqueda' });
			} else {
				avisar((res.json && res.json.msg) || errores.red);
			}
		} catch (err) {
			avisar(errores.red);
		}
		enviarBtn.disabled = false;
	});

	caja.querySelector('[data-siguiente]').addEventListener('click', () => ir(actual + 1, true));
	if (atras) atras.addEventListener('click', () => { actual = Math.max(0, actual - 1); avisar(''); pintar(true); });
	caja.querySelectorAll('[data-ir-paso]').forEach((b) => b.addEventListener('click', () => ir(Number(b.dataset.irPaso), false)));
	form.querySelectorAll('input[name="tipo"]').forEach((r) => r.addEventListener('change', () => { avisar(''); ponerKind(); pintar(false); }));
	['nombre', 'telefono'].forEach((n) => campo(n).addEventListener('input', () => avisar('')));
	const editar = caja.querySelector('[data-editar]');
	if (editar) editar.addEventListener('click', () => {
		listo.hidden = true;
		form.hidden = false;
		actual = 0;
		pintar(true);
	});

	ponerKind();
	pintar(false);
});
