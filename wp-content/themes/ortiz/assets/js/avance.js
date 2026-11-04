/**
 * Avance de obra: registro en dos pasos (datos → código del correo), filtro de reels por proyecto, ventana de
 * registro al tocar un reel bloqueado y ventana del reel abierto. Sin JS el registro funciona por admin-post.
 * Lógica de referencia: gSubmit, gVerify, projChips y openR de Avance de Obra.dc.html.
 */

const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const curva = 'cubic-bezier(.2,.7,.2,1)';
const aparecer = (el) => { if (el && !reducir() && el.animate) el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: curva }); };
const plural = (n, s, p) => n + ' ' + (n === 1 ? s : p);

/* ───────── Filtro de reels ───────── */
const zonaReels = document.querySelector('[data-reels]');
if (zonaReels) {
	const chips = [...zonaReels.querySelectorAll('[data-filtro]')];
	const reels = [...zonaReels.querySelectorAll('[data-reel]')];
	const total = zonaReels.querySelector('[data-reels-n]');
	chips.forEach((c) => c.addEventListener('click', () => {
		const f = c.dataset.filtro;
		chips.forEach((o) => o.setAttribute('aria-selected', String(o === c)));
		let n = 0;
		reels.forEach((r) => {
			const ver = f === 'todos' || r.dataset.proyecto === f;
			r.hidden = !ver;
			if (ver) { n += 1; aparecer(r); }
		});
		if (total) total.textContent = plural(n, 'reel', 'reels') + (c.dataset.nombre ? ' de ' + c.dataset.nombre : '');
		// La URL queda al día (?proyecto=slug) para compartirla.
		const url = new URL(window.location.href);
		if (f === 'todos') url.searchParams.delete('proyecto'); else url.searchParams.set('proyecto', f);
		window.history.replaceState(null, '', url);
	}));
}

/* ───────── Ventanas (dialog) ───────── */
let origen = null;
const abrirDialogo = (d) => {
	if (!d || d.open) return;
	origen = document.activeElement;
	d.showModal();
	document.documentElement.classList.add('sin-scroll');
	aparecer(d.firstElementChild);
};
// Lo que hay que hacer al cerrar cada ventana. No se confía solo en el evento «close» (algunos navegadores no lo
// disparan): se ejecuta al cerrar con el botón, al tocar afuera y con Esc; «close» queda de respaldo.
const alCerrar = new Map();
const cerrarDialogo = (d) => {
	if (d.open) d.close();
	(alCerrar.get(d) || []).forEach((fn) => fn());
};
const despuesDeCerrar = () => {
	if (document.querySelector('.avdialogo[open]')) return;
	document.documentElement.classList.remove('sin-scroll');
	if (origen && origen.focus && document.contains(origen)) origen.focus({ preventScroll: true });
	origen = null;
};
document.querySelectorAll('.avdialogo').forEach((d) => {
	d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-cerrar]')) cerrarDialogo(d); });
	d.addEventListener('cancel', (e) => { e.preventDefault(); cerrarDialogo(d); });
	d.addEventListener('close', () => (alCerrar.get(d) || []).forEach((fn) => fn()));
});
const siCierra = (d, fn) => alCerrar.set(d, [...(alCerrar.get(d) || []), fn]);
document.querySelectorAll('.avdialogo').forEach((d) => siCierra(d, despuesDeCerrar));

/* Reel abierto (con registro): el video se pone al abrir y se quita al cerrar. */
const dReel = document.querySelector('[data-dialogo-reel]');
if (dReel) {
	const caja = dReel.querySelector('[data-reel-video]');
	const abrir = (boton) => {
		const url = boton.dataset.video || '';
		if (!url) return;
		caja.replaceChildren();
		if (/\.mp4(\?|$)/i.test(url)) {
			const v = document.createElement('video');
			v.src = url; v.controls = true; v.autoplay = true; v.playsInline = true;
			caja.append(v);
		} else {
			const f = document.createElement('iframe');
			f.src = url; f.title = boton.dataset.titulo || 'Reel de avance de obra';
			f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
			f.allowFullscreen = true;
			caja.append(f);
		}
		dReel.querySelector('[data-reel-meta]').textContent = boton.dataset.meta || '';
		dReel.querySelector('[data-reel-titulo]').textContent = boton.dataset.titulo || '';
		abrirDialogo(dReel);
	};
	siCierra(dReel, () => caja.replaceChildren());
	document.querySelectorAll('[data-reel]').forEach((b) => b.addEventListener('click', () => abrir(b)));
	document.querySelectorAll('[data-reel-abrir]').forEach((b) => b.addEventListener('click', () => {
		const r = document.querySelector(`[data-reel="${b.dataset.reelAbrir}"]`);
		if (r) abrir(r);
	}));
}

/* ───────── Registro (sin registro todavía) ───────── */
const tarjeta = document.querySelector('[data-gate]');
if (tarjeta) {
	let cfg = {};
	try { cfg = JSON.parse(tarjeta.querySelector('[data-gate-config]').textContent); } catch (e) { cfg = {}; }
	const form = tarjeta.querySelector('[data-gate-form]');
	const fCodigo = tarjeta.querySelector('[data-gate-codigo]');
	const errForm = tarjeta.querySelector('[data-gate-error]');
	const errCodigo = tarjeta.querySelector('[data-codigo-error]');
	const digitos = tarjeta.querySelector('[data-digitos]');
	const casa = document.querySelector('[data-gate-casa]');
	const dGate = document.querySelector('[data-dialogo-gate]');
	const espacio = dGate ? dGate.querySelector('[data-gate-espacio]') : null;
	const proyectos = () => [...form.querySelectorAll('input[name="proyectos[]"]')];
	const marcado = (n) => { const c = form.querySelector(`input[name="${n}"]:checked`); return c ? c.value : ''; };
	const valor = (n) => (form.elements[n] ? form.elements[n].value.trim() : '');
	let intento = false;
	form.noValidate = true;

	const mensaje = (el, t) => { el.textContent = t; el.hidden = t === ''; };

	/* Faltantes, en el orden y con las palabras del diseño. */
	const faltantes = () => {
		let tel = valor('telefono').replace(/\D/g, '');
		if (tel.length === 12 && tel.startsWith('57')) tel = tel.slice(2);
		return [
			!proyectos().some((p) => p.checked) && 'elegir al menos un proyecto',
			valor('nombre').length < 2 && 'tu nombre',
			!(tel.length === 10 && tel[0] === '3') && 'tu WhatsApp',
			!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor('correo')) && 'tu correo',
			!form.elements.acepto.checked && 'aceptar la política de datos',
		].filter(Boolean);
	};
	const revisar = () => { if (intento) { const f = faltantes(); mensaje(errForm, f.length ? 'Falta ' + f.join(', ') + '.' : ''); } };

	/* «N elegidos», «Elegir todos / Quitar todos» y campos según la relación. */
	const todos = form.querySelector('[data-todos]');
	const elegidos = form.querySelector('[data-elegidos]');
	const contar = () => {
		const n = proyectos().filter((p) => p.checked).length;
		elegidos.textContent = n ? n + (n === 1 ? ' elegido' : ' elegidos') : '';
		todos.textContent = n === proyectos().length ? 'Quitar todos' : 'Elegir todos';
	};
	todos.hidden = proyectos().length < 2;
	todos.addEventListener('click', () => {
		const poner = !proyectos().every((p) => p.checked);
		proyectos().forEach((p) => { p.checked = poner; });
		contar(); revisar();
	});
	const aplicarRol = () => {
		const rol = marcado('rol');
		form.querySelectorAll('[data-si-rol]').forEach((el) => {
			const ver = el.dataset.siRol === 'compre' ? rol.startsWith('Compré') : rol === 'Compré con otro vendedor';
			el.hidden = !ver;
			el.querySelectorAll('input').forEach((i) => { i.disabled = !ver; });
		});
	};
	form.addEventListener('change', (e) => {
		if (e.target.name === 'rol') aplicarRol();
		if (e.target.name === 'proyectos[]') contar();
		revisar();
	});
	form.addEventListener('input', revisar);

	/* Envío con fetch (nonces renovados si la página quedó en caché). */
	const envio = cfg.envio || {};
	const enviar = async (url, datos) => {
		const pedir = () => fetch(url, { method: 'POST', body: datos, credentials: 'same-origin', headers: { 'X-WP-Nonce': envio.restNonce || '' } })
			.then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
		let res = await pedir();
		const codigo = res.json ? (res.json.codigo || res.json.code) : '';
		if (res.status === 403 && (codigo === 'ortiz_nonce' || codigo === 'rest_cookie_invalid_nonce') && envio.nonceUrl) {
			const n = await (await fetch(envio.nonceUrl, { credentials: 'same-origin' })).json();
			envio.restNonce = n.restNonce;
			datos.set('_ortiz_nonce', n.nonce);
			const oculto = form.querySelector('input[name="_ortiz_nonce"]');
			if (oculto) oculto.value = n.nonce;
			res = await pedir();
		}
		return res;
	};

	const pedirCodigo = async (boton) => {
		boton.disabled = true;
		try {
			const res = await enviar(cfg.codigo, new FormData(form));
			if (!res.json || !res.json.ok) return { error: res.json && res.json.msg ? res.json.msg : 'No pudimos enviar el código. Inténtalo de nuevo.' };
			if (res.json.token) fCodigo.querySelector('[data-token]').value = res.json.token;
			return { ok: true };
		} catch (e) {
			return { error: 'No pudimos enviar el código. Revisa tu conexión.' };
		} finally {
			boton.disabled = false;
		}
	};

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		intento = true;
		if (faltantes().length) { revisar(); return; }
		const r = await pedirCodigo(form.querySelector('[data-gate-enviar]'));
		if (r.error) { mensaje(errForm, r.error); return; }
		mensaje(errForm, '');
		fCodigo.querySelector('[data-correo]').textContent = valor('correo');
		form.hidden = true;
		fCodigo.hidden = false;
		mensaje(errCodigo, '');
		digitos.value = '';
		aparecer(fCodigo);
		digitos.focus();
	});

	/* Paso 2: solo dígitos, máximo 6. */
	digitos.addEventListener('input', () => {
		digitos.value = digitos.value.replace(/\D/g, '').slice(0, 6);
		mensaje(errCodigo, '');
	});
	fCodigo.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (digitos.value.length !== 6) { mensaje(errCodigo, 'El código tiene 6 dígitos.'); return; }
		const boton = fCodigo.querySelector('[data-verificar]');
		boton.disabled = true;
		try {
			const datos = new FormData();
			datos.set('token', fCodigo.querySelector('[data-token]').value);
			datos.set('codigo', digitos.value);
			const res = await enviar(cfg.verificar, datos);
			if (res.json && res.json.ok) {
				if (window.ortizEvento) window.ortizEvento('generate_lead', { form_name: 'avance_acceso' });
				// Con la cookie puesta, la página se vuelve a pintar con los videos.
				const url = new URL(cfg.volver || window.location.href);
				const actual = new URL(window.location.href);
				if (actual.searchParams.get('proyecto')) url.searchParams.set('proyecto', actual.searchParams.get('proyecto'));
				const mismaPagina = url.origin + url.pathname + url.search === actual.origin + actual.pathname + actual.search;
				url.hash = 's-reels';
				if (mismaPagina) {
					window.history.replaceState(null, '', url.toString());
					window.location.reload();
				} else {
					window.location.replace(url.toString());
				}
				return;
			}
			mensaje(errCodigo, res.json && res.json.msg ? res.json.msg : 'No pudimos verificar el código. Inténtalo de nuevo.');
		} catch (err) {
			mensaje(errCodigo, 'No pudimos verificar el código. Revisa tu conexión.');
		} finally {
			boton.disabled = false;
		}
	});

	const reenviar = fCodigo.querySelector('[data-reenviar]');
	reenviar.addEventListener('click', async () => {
		if (!valor('correo')) { form.hidden = false; fCodigo.hidden = true; return; }
		const r = await pedirCodigo(reenviar);
		if (r.error) { mensaje(errCodigo, r.error); return; }
		reenviar.textContent = 'Código reenviado ✓';
		digitos.focus();
	});
	fCodigo.querySelector('[data-cambiar]').addEventListener('click', (e) => {
		e.preventDefault();
		fCodigo.hidden = true;
		form.hidden = false;
		reenviar.textContent = 'Reenviar código';
		aparecer(form);
		form.elements.correo.focus();
	});

	/* Reel bloqueado → la misma tarjeta en una ventana, con ese proyecto ya elegido. */
	if (dGate && espacio && casa) {
		const llevar = (proyectoId) => {
			const casilla = proyectos().find((p) => p.value === String(proyectoId));
			if (casilla && !casilla.checked) { casilla.checked = true; contar(); }
			espacio.append(tarjeta);
			abrirDialogo(dGate);
		};
		siCierra(dGate, () => { if (tarjeta.parentElement !== casa) casa.append(tarjeta); });
		document.querySelectorAll('[data-reel]').forEach((b) => b.addEventListener('click', () => llevar(b.dataset.proyectoId)));
	}
	// «Desbloquear reels» del teléfono: baja al registro y pone el foco en el primer campo.
	document.querySelectorAll('[data-ir-gate]').forEach((a) => a.addEventListener('click', () => {
		setTimeout(() => { const n = form.hidden ? digitos : form.elements.nombre; if (n) n.focus({ preventScroll: true }); }, reducir() ? 0 : 450);
	}));

	aplicarRol();
	contar();
}
