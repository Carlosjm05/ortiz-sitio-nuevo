/**
 * Vende tu propiedad: formulario de 4 pasos con vista previa en vivo («Así va tu ficha»), contadores, ubicación
 * GPS, fotos y documentos, y envío con fetch (archivos incluidos). Después de guardar se abre WhatsApp con el
 * resumen que arma el servidor. Sin JS el formulario se ve completo y se envía por admin-post.
 * Lógica de referencia: renderVals → vende en Vende tu Propiedad.dc.html.
 */

const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const curva = 'cubic-bezier(.2,.7,.2,1)';
const miles = (n) => n.toLocaleString('es-CO');

document.querySelectorAll('[data-vender]').forEach((form) => {
	let cfg = {};
	try { cfg = JSON.parse(form.querySelector('[data-vender-config]').textContent); } catch (e) { cfg = {}; }
	const construidos = cfg.construidos || ['Casa', 'Finca', 'Apartamento'];
	const $ = (s) => form.querySelector(s);
	const $$ = (s) => [...form.querySelectorAll(s)];
	const campo = (n) => form.elements[n];
	const valor = (n) => (campo(n) && campo(n).value ? String(campo(n).value).trim() : '');
	const marcado = (n) => { const c = form.querySelector(`input[name="${n}"]:checked`); return c ? c.value : ''; };

	const pasos = $$('[data-paso]');
	const tabs = $$('[data-ir]');
	const atras = $('[data-atras]');
	const sig = $('[data-siguiente]');
	const enviar = $('[data-enviar]');
	const falta = $('[data-falta]');
	const barra = $('[data-progreso]');
	let paso = 1;
	let intento = false;

	form.classList.add('is-pasos');
	form.noValidate = true;

	/* ───── Validación del paso 1 (mismos mensajes del diseño) ───── */
	const faltantes = () => {
		const f = [];
		if (valor('nombre').length < 2) f.push('tu nombre');
		let tel = valor('telefono').replace(/\D/g, '');
		if (tel.length === 12 && tel.startsWith('57')) tel = tel.slice(2);
		if (!(tel.length === 10 && tel[0] === '3')) f.push('tu WhatsApp');
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor('correo'))) f.push('tu correo');
		if (!campo('acepto').checked) f.push('aceptar la política de datos');
		return f;
	};
	const errorNav = $('[data-error]');
	const mostrarFalta = (texto) => {
		if (!falta) return;
		falta.textContent = texto;
		falta.hidden = texto === '';
	};
	// Errores de los demás pasos (archivos, servidor): junto a los botones.
	const mostrarError = (texto) => {
		if (!errorNav) return;
		errorNav.textContent = texto;
		errorNav.hidden = texto === '';
	};
	const revisarFalta = () => {
		if (!intento) return;
		const f = faltantes();
		mostrarFalta(f.length ? 'Falta ' + f.join(', ') + '.' : '');
	};

	/* ───── Pasos ───── */
	const ir = (n, foco) => {
		const antes = paso;
		paso = Math.min(4, Math.max(1, n));
		if (antes !== paso) mostrarError('');
		pasos.forEach((p) => { p.hidden = Number(p.dataset.paso) !== paso; });
		tabs.forEach((t) => {
			const k = Number(t.dataset.ir);
			t.setAttribute('aria-selected', String(k === paso));
			t.classList.toggle('is-hecho', k < paso);
			t.querySelector('.vform__marca').textContent = k < paso ? '✓' : String(k);
		});
		if (barra) barra.style.width = (paso / 4 * 100) + '%';
		atras.hidden = paso === 1;
		sig.hidden = paso === 4;
		enviar.hidden = paso !== 4;
		const visible = pasos.find((p) => !p.hidden);
		if (visible && antes !== paso && !reducir() && visible.animate) {
			visible.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: curva });
		}
		if (foco && antes !== paso) {
			const cab = $('.vform__cab');
			if (cab && cab.getBoundingClientRect().top < 80) form.scrollIntoView({ behavior: reducir() ? 'auto' : 'smooth', block: 'start' });
		}
	};
	const intentarIr = (n) => {
		if (n > 1 && faltantes().length) {
			intento = true;
			revisarFalta();
			ir(1, true);
			// Foco en el primer dato que falta.
			const f = faltantes();
			const primero = f[0] === 'tu nombre' ? 'nombre' : f[0] === 'tu WhatsApp' ? 'telefono' : f[0] === 'tu correo' ? 'correo' : 'acepto';
			if (campo(primero)) campo(primero).focus();
			return;
		}
		intento = false;
		mostrarFalta('');
		ir(n, true);
	};
	tabs.forEach((t) => t.addEventListener('click', () => intentarIr(Number(t.dataset.ir))));
	sig.addEventListener('click', () => intentarIr(paso + 1));
	atras.addEventListener('click', () => ir(paso - 1, true));

	/* ───── Tipo: campos de lo construido y «Lo que tiene» según el tipo ───── */
	const esConstruido = () => construidos.includes(marcado('tipo'));
	const aplicarTipo = () => {
		const c = esConstruido();
		$$('[data-construido]').forEach((el) => {
			el.hidden = !c;
			el.querySelectorAll('input,button').forEach((i) => { i.disabled = !c; });
		});
		$$('[data-tiene]').forEach((g) => {
			const on = (g.dataset.tiene === 'construido') === c;
			g.hidden = !on;
			g.querySelectorAll('input').forEach((i) => { i.disabled = !on; });
		});
	};

	/* ───── Contadores de habitaciones y baños ───── */
	$$('[data-contador]').forEach((c) => {
		const n = c.querySelector('input');
		const poner = (v) => { n.value = String(Math.max(0, Math.min(30, v))); actualizar(); };
		c.querySelector('[data-menos]').addEventListener('click', () => poner((parseInt(n.value, 10) || 0) - 1));
		c.querySelector('[data-mas]').addEventListener('click', () => poner((parseInt(n.value, 10) || 0) + 1));
		n.addEventListener('change', () => poner(parseInt(n.value.replace(/\D/g, ''), 10) || 0));
	});

	/* ───── Precio con puntos de miles ───── */
	const precio = campo('precio');
	precio.addEventListener('input', () => {
		const n = Number(precio.value.replace(/\D/g, '')) || 0;
		precio.value = n ? miles(n) : '';
	});

	/* ───── Ubicación GPS (opcional) ───── */
	const gpsBtn = $('[data-gps-btn]');
	const gpsTxt = $('[data-gps-txt]');
	const gpsVal = $('[data-gps-valor]');
	if (gpsBtn && 'geolocation' in navigator) {
		gpsBtn.hidden = false;
		gpsBtn.addEventListener('click', () => {
			gpsTxt.textContent = 'Buscando…';
			navigator.geolocation.getCurrentPosition(
				(p) => {
					const v = p.coords.latitude.toFixed(5) + ', ' + p.coords.longitude.toFixed(5);
					gpsVal.value = v;
					gpsTxt.textContent = '✓ ' + v;
				},
				() => { gpsTxt.textContent = 'No pudimos obtener la ubicación'; },
				{ enableHighAccuracy: true, timeout: 15000 }
			);
		});
	} else if (gpsTxt) {
		gpsTxt.textContent = 'Tu navegador no permite ubicación';
	}

	/* ───── Fotos y documentos ───── */
	const fotoPrev = document.querySelector('[data-prev-foto]');
	let fotoUrl = '';
	$$('[data-carga]').forEach((caja) => {
		const input = caja.querySelector('[data-carga-input]');
		const txt = caja.querySelector('[data-carga-txt]');
		const ico = caja.querySelector('[data-carga-ico]');
		const esFotos = input.name === 'fotos[]';
		const max = esFotos ? (cfg.maxFotos || 5) : (cfg.maxDocs || 4);
		const tipos = esFotos ? ['image/jpeg', 'image/png', 'image/webp'] : ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
		input.addEventListener('change', () => {
			const archivos = [...(input.files || [])];
			let error = '';
			if (archivos.length > max) error = `Puedes subir hasta ${max} archivos aquí.`;
			const malo = archivos.find((a) => !tipos.includes(a.type));
			if (!error && malo) error = `«${malo.name}» no es ${esFotos ? 'una foto JPG, PNG o WEBP' : 'una foto ni un PDF'}.`;
			const pesado = archivos.find((a) => a.size > (cfg.maxArchivo || 10485760));
			if (!error && pesado) error = `«${pesado.name}» pesa más de ${Math.round((cfg.maxArchivo || 10485760) / 1048576)} MB. Envíalo por WhatsApp.`;
			if (error) input.value = '';
			const ok = !error && archivos.length > 0;
			caja.classList.toggle('is-ok', ok);
			caja.classList.toggle('is-error', !!error);
			ico.textContent = ok ? '✓' : '↑';
			txt.textContent = error || (ok ? (archivos.length === 1 ? archivos[0].name : archivos.length + ' archivos') : txt.dataset.pista);
			if (esFotos && fotoPrev) {
				if (fotoUrl) URL.revokeObjectURL(fotoUrl);
				fotoUrl = ok ? URL.createObjectURL(archivos[0]) : '';
				if (!fotoPrev.dataset.original) fotoPrev.dataset.original = fotoPrev.currentSrc || fotoPrev.src;
				fotoPrev.removeAttribute('srcset');
				fotoPrev.src = fotoUrl || fotoPrev.dataset.original;
				fotoPrev.style.objectPosition = fotoUrl ? 'center' : '';
			}
			actualizar();
		});
	});

	/* ───── Varios propietarios: aviso de poder notarial ───── */
	const poder = $('[data-poder]');
	const aplicarPoder = () => { if (poder) poder.hidden = marcado('propietarios') === '1' || marcado('propietarios') === ''; };

	/* ───── Vista previa «Así va tu ficha» ───── */
	const prev = {
		tipo: document.querySelector('[data-prev-tipo]'),
		titulo: document.querySelector('[data-prev-titulo]'),
		lugar: document.querySelector('[data-prev-lugar]'),
		chips: document.querySelector('[data-prev-chips]'),
		neg: document.querySelector('[data-prev-neg]'),
		precio: document.querySelector('[data-prev-precio]'),
		pct: document.querySelector('[data-prev-pct]'),
	};
	const actualizar = () => {
		const tipo = marcado('tipo') || 'Casa';
		const mun = valor('municipio');
		const c = esConstruido();
		const area = valor('area_lote');
		const areaC = valor('area_construida');
		const p = Number(valor('precio').replace(/\D/g, '')) || 0;
		const tiene = $$('[data-tiene]:not([hidden]) input:checked').map((i) => i.value);
		if (prev.tipo) prev.tipo.textContent = tipo;
		if (prev.titulo) prev.titulo.textContent = tipo + ' en ' + mun;
		if (prev.lugar) prev.lugar.textContent = (valor('sector') || 'Sector por definir') + ' · ' + mun;
		if (prev.chips) {
			const chips = [area && area + ' m² de lote', c && areaC && areaC + ' m² construidos', c && valor('habitaciones') + ' hab.', c && valor('banos') + ' baños', ...tiene.slice(0, 3)].filter(Boolean);
			prev.chips.replaceChildren(...chips.map((t) => { const s = document.createElement('span'); s.textContent = t; return s; }));
		}
		if (prev.precio) prev.precio.textContent = p ? '$' + (p / 1e6).toLocaleString('es-CO') + 'M' : '$ —';
		if (prev.neg) prev.neg.textContent = marcado('negociable') === 'Sí' ? 'Precio negociable' : 'Precio';
		if (prev.pct) {
			const lleno = [area, valor('sector'), p, valor('nombre'), valor('telefono'), tiene.length, c ? areaC : 1].filter(Boolean).length;
			prev.pct.textContent = Math.round(lleno / 7 * 100) + '%';
		}
	};

	form.addEventListener('input', () => { actualizar(); revisarFalta(); });
	form.addEventListener('change', (e) => {
		if (e.target.name === 'tipo') aplicarTipo();
		if (e.target.name === 'propietarios') aplicarPoder();
		actualizar();
		revisarFalta();
	});
	// Enter en un campo de texto avanza de paso en vez de enviar.
	form.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' && e.target.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="file"])') && paso < 4) {
			e.preventDefault();
			intentarIr(paso + 1);
		}
	});

	/* ───── Envío: se guarda (con archivos) y luego se abre WhatsApp ───── */
	const envio = cfg.envio || {};
	const publicar = async (datos) => {
		const res = await fetch(envio.url, { method: 'POST', body: datos, credentials: 'same-origin', headers: { 'X-WP-Nonce': envio.restNonce || '' } });
		let json = null;
		try { json = await res.json(); } catch (e) { json = null; }
		return { status: res.status, json };
	};
	const txtEnviar = $('[data-enviar-txt]');
	const original = txtEnviar ? txtEnviar.textContent : '';
	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		// Sin los datos de contacto no se envía: vuelve al paso 1 con el aviso.
		if (faltantes().length) { intentarIr(2); return; }
		if (!envio.url) { form.submit(); return; }
		// La pestaña se abre ya (en respuesta al clic) para que el navegador no la bloquee; se llena al guardar.
		let ventana = null;
		try { ventana = window.open('', '_blank'); } catch (err) { ventana = null; }
		if (ventana) { try { ventana.document.write('<p style="font-family:sans-serif;padding:24px">Abriendo WhatsApp…</p>'); } catch (err) { /* nada */ } }
		enviar.disabled = true;
		if (txtEnviar) txtEnviar.textContent = 'Enviando…';
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
				if (ventana) ventana.close();
				const msg = res.json && res.json.msg ? res.json.msg : 'No pudimos enviar. Revisa tu conexión e inténtalo de nuevo.';
				const donde = res.json && res.json.paso ? Number(res.json.paso) : paso;
				ir(donde, true);
				if (donde === 1) mostrarFalta(msg); else mostrarError(msg);
				return;
			}
			const wa = res.json.wa || '';
			if (wa && ventana) ventana.location.href = wa;
			else if (ventana) ventana.close();
			const listo = $('[data-listo]');
			const nombre = valor('nombre').split(/\s+/)[0] || '';
			listo.querySelector('[data-listo-titulo]').textContent = (cfg.listo || '').replace('{nombre}', nombre).replace(/\s+\./, '.');
			const enlace = listo.querySelector('[data-listo-wa]');
			if (wa) enlace.href = wa; else enlace.hidden = true;
			$$('.vform__cab, [data-paso], .vform__nav, [data-error]').forEach((el) => { el.hidden = true; });
			listo.hidden = false;
			if (!reducir() && listo.animate) listo.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: curva });
			listo.focus();
			if (!ventana && wa) window.location.href = wa;
			if (window.ortizEvento) window.ortizEvento('generate_lead', { form_name: 'vender' });
		} catch (err) {
			if (ventana) ventana.close();
			mostrarError('No pudimos enviar. Revisa tu conexión e inténtalo de nuevo.');
		} finally {
			enviar.disabled = false;
			if (txtEnviar) txtEnviar.textContent = original;
		}
	});

	aplicarTipo();
	aplicarPoder();
	actualizar();
	ir(1, false);
});
