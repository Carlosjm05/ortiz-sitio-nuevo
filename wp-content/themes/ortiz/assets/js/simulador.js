/**
 * Simulador de crédito de la ficha de proyecto.
 * Cálculo idéntico a ortiz_calcular() (ortiz-core/inc/calculadora.php) y a la calculadora Ortiz:
 *   cuota inicial = valor fijo o % del precio · saldo de la inicial = CI − separación
 *   total a financiar = precio − max(CI, separación) · N cuotas; la última ajusta el redondeo a miles.
 * El resumen se desbloquea con nombre, WhatsApp y correo válidos. La cotización se guarda y se envía al
 * correo una sola vez (3 s después de quedar lista, o al tocar WhatsApp o PDF); el servidor recalcula.
 * Lógica de referencia: renderVals / enviarSiFalta de Plantilla Proyecto.dc.html.
 */

const raiz = document.querySelector('[data-simulador]');

if (raiz) {
	let cfg = {};
	try {
		cfg = JSON.parse(raiz.querySelector('[data-sim-config]').textContent);
	} catch (e) {
		cfg = {};
	}
	const form = raiz.querySelector('[data-sim-form]');
	const el = (s) => raiz.querySelector(s);
	const nf = new Intl.NumberFormat('es-CO');
	const M = (n) => '$' + nf.format(Math.round(n));
	const meses = (n) => n + (n === 1 ? ' mes' : ' meses');
	const campo = (nombre) => form.elements.namedItem(nombre);
	const valor = (nombre) => {
		const c = campo(nombre);
		return c ? String(c.value) : '';
	};
	const unidades = Array.isArray(cfg.unidades) ? cfg.unidades : [];
	const disponibles = unidades.filter((u) => u.estado === 'Disponible');
	const estado = { sep: null, enviado: false, enviando: false, temporizador: null, mensaje: '' };

	/** Celular colombiano: 10 dígitos que empiezan por 3 (acepta +57 delante). */
	const celular = (v) => {
		let d = String(v).replace(/\D/g, '');
		if (d.length === 12 && d.startsWith('57')) d = d.slice(2);
		return d.length === 10 && d[0] === '3' ? d : '';
	};

	const calcular = () => {
		const sel = unidades.find((u) => u.codigo === valor('unidad') && u.estado === 'Disponible') || disponibles[0] || unidades[0] || { codigo: '', area: '', precio: 0 };
		const fin = valor('modo') !== 'contado';
		const P = Number(sel.precio) || 0;
		const S0 = Number(cfg.sepMin) || 0;
		const NMAX = Number(cfg.plazoMax) || 12;
		const CI = fin ? (Number(cfg.ciValor) || Math.round(P * (Number(cfg.ciPct) || 0.3))) : 0;
		const S = Math.max(0, estado.sep == null ? S0 : estado.sep);
		const N = Math.min(NMAX, Math.max(1, Number(valor('plazo')) || NMAX));
		const sI = fin ? Math.max(CI - S, 0) : 0;
		const sD = fin ? Math.max(P - Math.max(CI, S), 0) : 0;
		let cB = 0;
		let cF = 0;
		if (sD > 0) {
			if (N <= 1) {
				cB = sD;
				cF = sD;
			} else {
				cB = Math.floor(sD / N / 1000) * 1000;
				cF = sD - cB * (N - 1);
			}
		}
		return { sel, fin, P, S0, NMAX, CI, S, N, sI, sD, cB, cF };
	};

	const revisar = () => {
		const nombre = valor('nombre').trim();
		const correo = valor('correo').trim();
		const tel = celular(valor('telefono'));
		const c = calcular();
		const ok = { nombre: nombre.length >= 3, telefono: tel !== '', correo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) };
		const sepErr = c.S < c.S0;
		return { nombre, correo, tel, c, ok, sepErr, listo: ok.nombre && ok.telefono && ok.correo && !sepErr };
	};

	const pintar = () => {
		const r = revisar();
		const { c } = r;

		// Separación por debajo del mínimo (solo después de que la persona la cambia).
		const err = el('[data-sim-error]');
		const conErr = r.sepErr && estado.sep != null;
		if (err) {
			err.hidden = !conErr;
			err.textContent = conErr ? 'El monto es inferior al mínimo de ' + M(c.S0) + '.' : '';
		}
		const sep = campo('separacion');
		if (sep) sep.setAttribute('aria-invalid', conErr ? 'true' : 'false');

		// Plazo solo en financiado; beneficio por comprar ya; nombre del asesor si dijo que sí.
		const plazo = el('[data-sim-plazo]');
		if (plazo) plazo.hidden = !c.fin;
		const plazoTxt = el('[data-sim-plazo-texto]');
		if (plazoTxt) plazoTxt.textContent = meses(c.N);
		const ya = el('[data-sim-ya]');
		if (ya) ya.hidden = !(cfg.beneficio && valor('cuando') === cfg.cuandoYa);
		const asesor = el('[data-sim-asesor]');
		if (asesor) asesor.hidden = valor('asesor_si') !== 'si';

		// Resumen bloqueado hasta tener los datos de contacto.
		el('[data-sim-bloqueo]').hidden = r.listo;
		el('[data-sim-listo]').hidden = !r.listo;
		const mensaje = !r.ok.nombre ? 'Escribe tu nombre completo.'
			: !r.ok.telefono ? (valor('telefono').trim() ? 'El número de WhatsApp no parece válido.' : 'Escribe tu número de WhatsApp.')
			: !r.ok.correo ? (r.correo ? 'Revisa el correo electrónico.' : 'Escribe tu correo electrónico.')
			: 'La separación mínima es ' + M(c.S0) + '.';
		if (mensaje !== estado.mensaje) {
			estado.mensaje = mensaje;
			el('[data-sim-msj]').textContent = mensaje;
		}
		Object.keys(r.ok).forEach((k) => {
			const li = el('[data-sim-check="' + k + '"]');
			if (!li) return;
			li.classList.toggle('is-ok', r.ok[k]);
			li.firstElementChild.textContent = r.ok[k] ? '✓' : '·';
		});

		if (r.listo) {
			const us = cfg.us || 'lote';
			const filas = c.fin
				? [['Valor del ' + us, M(c.P)], ['Cuota inicial (' + (c.P ? Math.round(c.CI / c.P * 100) : 0) + '%)', M(c.CI)], ['Separación', M(c.S)], ['Saldo de la inicial', M(c.sI)], ['Total a financiar', M(c.sD)], ['Plazo', meses(c.N)]]
				: [['Valor del ' + us, M(c.P)], ['Separación', M(c.S)], ['Saldo a pagar de contado', M(c.P - c.S)]];
			const dl = el('[data-sim-filas]');
			dl.replaceChildren(...filas.map(([k, v]) => {
				const fila = document.createElement('div');
				const dt = document.createElement('dt');
				const dd = document.createElement('dd');
				dt.textContent = k;
				dd.textContent = v;
				fila.append(dt, dd);
				return fila;
			}));
			const lblB = c.N <= 1 ? 'Cuota 1' : 'Cuota 1 a ' + (c.N - 1);
			const lblF = 'Cuota ' + c.N;
			el('[data-sim-cuota-k]').textContent = c.fin ? lblB : 'Pago de contado';
			el('[data-sim-cuota]').textContent = c.fin ? M(c.cB) : M(c.P - c.S);
			el('[data-sim-ult-k]').textContent = c.fin ? lblF + ' (ajuste)' : 'Separación';
			el('[data-sim-ult]').textContent = c.fin ? M(c.cF) : M(c.S);

			const nombreAsesor = valor('asesor_si') === 'si' ? valor('asesor').trim() : '';
			const msg = '*Cotización ' + cfg.nombre + '*\nCliente: ' + r.nombre + '\nCorreo: ' + r.correo + '\n' + cfg.uCap + ': ' + c.sel.codigo + (c.sel.area ? ' · ' + c.sel.area : '')
				+ '\nValor: ' + M(c.P) + '\nSeparación: ' + M(c.S)
				+ (c.fin
					? '\nCuota inicial: ' + M(c.CI) + '\nSaldo de la inicial: ' + M(c.sI) + '\nTotal a financiar: ' + M(c.sD) + '\nPlazo: ' + c.N + ' meses\n' + lblB + ': ' + M(c.cB) + '\n' + lblF + ': ' + M(c.cF)
					: '\nPago de contado: ' + M(c.P - c.S))
				+ (valor('cuando') ? '\nPienso comprar: ' + valor('cuando') : '')
				+ (nombreAsesor ? '\nMe atendió: ' + nombreAsesor : '');
			const wa = el('[data-sim-wa]');
			if (wa && cfg.wa) wa.href = cfg.wa + '?text=' + encodeURIComponent(msg);
		}

		// Guardado y envío automáticos (una sola vez), 3 s después de quedar lista.
		if (r.listo && !estado.enviado) {
			if (!estado.temporizador) estado.temporizador = setTimeout(() => { estado.temporizador = null; enviar(); }, 3000);
		} else if (estado.temporizador && !r.listo) {
			clearTimeout(estado.temporizador);
			estado.temporizador = null;
		}
	};

	const aviso = (texto, error) => {
		const caja = el('[data-sim-enviada]');
		if (!caja) return;
		caja.hidden = false;
		caja.classList.toggle('is-error', !!error);
		caja.firstElementChild.textContent = error ? '!' : '✓';
		el('[data-sim-enviada-txt]').textContent = texto;
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

	const enviar = async () => {
		const r = revisar();
		if (estado.enviado || estado.enviando || !r.listo || !cfg.envio || !cfg.envio.url) return;
		estado.enviando = true;
		const datos = new FormData(form);
		datos.set('separacion', String(r.c.S));
		datos.set('telefono', r.tel);
		datos.set('unidad', r.c.sel.codigo);
		try {
			let res = await publicar(datos);
			// Página guardada en caché más de un día: se piden nonces nuevos y se reintenta una vez.
			if (res.status === 403 && res.json && res.json.codigo === 'ortiz_nonce' && cfg.envio.nonceUrl) {
				const n = await (await fetch(cfg.envio.nonceUrl, { credentials: 'same-origin' })).json();
				cfg.envio.nonce = n.nonce;
				cfg.envio.restNonce = n.restNonce;
				datos.set('_ortiz_nonce', n.nonce);
				res = await publicar(datos);
			}
			estado.enviado = true;
			if (res.json && res.json.ok) {
				aviso(String(cfg.enviada || '').replace('{correo}', r.correo), false);
				if (window.ortizEvento) window.ortizEvento('generate_lead', { form_name: 'cotizacion' });
			} else {
				aviso((res.json && res.json.msg) || 'No pudimos enviar la cotización. Escríbenos por WhatsApp.', true);
			}
		} catch (e) {
			// Sin conexión: se vuelve a intentar con el próximo clic en WhatsApp o PDF.
		}
		estado.enviando = false;
	};

	// Separación: solo números, con puntos de miles mientras se escribe (como el diseño).
	const sep = campo('separacion');
	if (sep) {
		sep.addEventListener('input', () => {
			const d = sep.value.replace(/\D/g, '');
			estado.sep = d ? Number(d) : 0;
			sep.value = nf.format(estado.sep);
			sep.setSelectionRange(sep.value.length, sep.value.length);
		});
	}

	form.addEventListener('input', pintar);
	form.addEventListener('change', pintar);
	form.addEventListener('submit', (e) => e.preventDefault());

	const wa = el('[data-sim-wa]');
	if (wa) wa.addEventListener('click', () => { enviar(); });
	const pdf = el('[data-sim-pdf]');
	if (pdf) {
		pdf.addEventListener('click', () => {
			enviar();
			document.documentElement.classList.add('imprimir-cotizacion');
			window.print();
		});
		window.addEventListener('afterprint', () => document.documentElement.classList.remove('imprimir-cotizacion'));
	}

	pintar();
}
