/**
 * Listados (Proyectos, Casas, Buscador, colecciones): filtra las tarjetas sin recargar, con la misma lógica
 * que el servidor (ortiz_listado_pasa): pestañas de tipo con conteos, municipio, precio, habitaciones, orden y
 * filtros rápidos; «N resultados», «Limpiar», «No hay resultados» y la URL al día (?tipo=&municipio=…).
 * También «Precios de lotes por municipio»: el mapa sigue a la fila señalada y tocarla filtra el listado.
 * Lógica de referencia: renderVals → listado de Proyectos.dc.html, Propiedades.dc.html y Buscador.dc.html.
 */

const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const RAPIDOS = ['piscina', 'estrenar', 'conjunto', 'credito'];

const raiz = document.querySelector('[data-listado]');
if (raiz) {
	const form = raiz.querySelector('[data-filtros]');
	const grid = raiz.querySelector('[data-resultados]');
	const tarjetas = grid ? [...grid.children] : [];
	const pestanas = [...raiz.querySelectorAll('[data-tab]')];
	const campoTipo = raiz.querySelector('[data-f-tipo]');
	const sinRes = raiz.querySelector('[data-sin-res]');
	const campos = raiz.querySelector('[data-filtros-campos]');
	const abrir = raiz.querySelector('[data-filtros-abrir]');
	const select = (k) => raiz.querySelector('select[data-f="' + k + '"]');
	const rapido = (k) => document.querySelector('input[data-f="' + k + '"]');
	const base = form ? form.getAttribute('action') : location.pathname;
	const porDefecto = { municipio: '', precio_max: '0', area_min: '0', habitaciones: '0', orden: 'rel' };

	const inicial = new URLSearchParams(location.search);
	let tipo = campoTipo ? campoTipo.value : 'todos';
	// Filtros que llegan en la URL sin control en la página (p. ej. /buscar/?tipo=casa&piscina=1 del footer): se conservan.
	const sinControl = {};
	Object.keys(porDefecto).forEach((k) => { if (!select(k) && inicial.get(k)) sinControl[k] = inicial.get(k); });
	RAPIDOS.forEach((k) => { if (!rapido(k) && inicial.get(k) === '1') sinControl[k] = true; });

	const leer = () => {
		const f = { tipo };
		Object.keys(porDefecto).forEach((k) => {
			const s = select(k);
			f[k] = s ? s.value : (sinControl[k] || porDefecto[k]);
		});
		RAPIDOS.forEach((k) => {
			const c = rapido(k);
			f[k] = c ? c.checked : !!sinControl[k];
		});
		return f;
	};

	const dato = (t, k) => t.dataset[k] || '';
	const num = (t, k) => Number(t.dataset[k]) || 0;

	// Igual que ortiz_listado_pasa() del plugin.
	const pasa = (t, f, ignorarTipo) => {
		if (!ignorarTipo && f.tipo !== 'todos') {
			if (f.tipo === 'lotes') {
				if (dato(t, 'pt') !== 'proyecto') return false;
			} else if (dato(t, 'cat') !== f.tipo) {
				return false;
			}
		}
		if (f.municipio && dato(t, 'mun') !== f.municipio) return false;
		const max = Number(f.precio_max) || 0;
		if (max && num(t, 'precio') > max) return false;
		const area = Number(f.area_min) || 0;
		if (area && num(t, 'area') < area) return false;
		const hab = Number(f.habitaciones) || 0;
		if (hab && (dato(t, 'pt') !== 'propiedad' || num(t, 'hab') < hab)) return false;
		return RAPIDOS.every((k) => !f[k] || num(t, k) > 0);
	};

	// Proyectos primero y luego casas; dentro de cada grupo «Destacados» o por precio.
	const ordenar = (orden) => {
		const lista = [...tarjetas].sort((a, b) => {
			const g = (dato(a, 'pt') === 'proyecto' ? 0 : 1) - (dato(b, 'pt') === 'proyecto' ? 0 : 1);
			if (g) return g;
			if (orden === 'asc') return (num(a, 'precio') - num(b, 'precio')) || (num(a, 'orden') - num(b, 'orden'));
			if (orden === 'desc') return (num(b, 'precio') - num(a, 'precio')) || (num(a, 'orden') - num(b, 'orden'));
			return num(a, 'orden') - num(b, 'orden');
		});
		const actual = [...grid.children];
		if (lista.some((t, i) => actual[i] !== t)) grid.append(...lista);
	};

	const urlDe = (f) => {
		const p = new URLSearchParams();
		if (pestanas.length && f.tipo !== 'todos') p.set('tipo', f.tipo);
		Object.keys(porDefecto).forEach((k) => {
			if (f[k] !== porDefecto[k] && f[k] !== '') p.set(k, f[k]);
		});
		RAPIDOS.forEach((k) => { if (f[k]) p.set(k, '1'); });
		const q = p.toString();
		return base + (q ? '?' + q : '');
	};

	const aplicar = () => {
		const f = leer();
		let n = 0;
		tarjetas.forEach((t) => {
			const ok = pasa(t, f, false);
			t.hidden = !ok;
			if (ok) n++;
		});
		ordenar(f.orden);

		pestanas.forEach((p) => {
			const v = p.dataset.tab;
			const on = v === f.tipo;
			p.setAttribute('aria-selected', String(on));
			p.tabIndex = on ? 0 : -1;
			const cuenta = p.querySelector('[data-tab-n]');
			if (cuenta) cuenta.textContent = String(tarjetas.filter((t) => pasa(t, f, true) && (v === 'todos' || dato(t, 'cat') === v)).length);
		});
		if (campoTipo) campoTipo.value = f.tipo;

		const texto = n + (n === 1 ? ' resultado' : ' resultados');
		raiz.querySelectorAll('[data-res-texto]').forEach((el) => { el.textContent = texto; });
		const algo = f.tipo !== 'todos' || Object.keys(porDefecto).some((k) => f[k] !== porDefecto[k]) || RAPIDOS.some((k) => f[k]);
		const limpiar = raiz.querySelector('.filtros__limpiar[data-limpiar]');
		if (limpiar) limpiar.hidden = !algo;
		if (sinRes) sinRes.hidden = n > 0;

		const url = urlDe(f);
		if (url !== location.pathname + location.search) history.replaceState(null, '', url + location.hash);
	};

	const limpiarTodo = () => {
		tipo = 'todos';
		Object.keys(sinControl).forEach((k) => { delete sinControl[k]; });
		Object.keys(porDefecto).forEach((k) => {
			const s = select(k);
			if (s) s.value = porDefecto[k];
		});
		RAPIDOS.forEach((k) => {
			const c = rapido(k);
			if (c) c.checked = false;
		});
		aplicar();
	};

	// Pestañas de tipo (sin JS son botones que envían el formulario).
	pestanas.forEach((p, i) => {
		p.type = 'button';
		p.addEventListener('click', () => {
			tipo = p.dataset.tab;
			aplicar();
		});
		p.addEventListener('keydown', (e) => {
			if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
			e.preventDefault();
			const sig = pestanas[(i + (e.key === 'ArrowRight' ? 1 : -1) + pestanas.length) % pestanas.length];
			sig.focus();
			tipo = sig.dataset.tab;
			aplicar();
		});
	});

	raiz.querySelectorAll('select[data-f]').forEach((s) => s.addEventListener('change', aplicar));
	document.querySelectorAll('input[data-f]').forEach((c) => c.addEventListener('change', aplicar));
	if (form) form.addEventListener('submit', (e) => { e.preventDefault(); aplicar(); });
	raiz.querySelectorAll('[data-limpiar]').forEach((a) => a.addEventListener('click', (e) => {
		e.preventDefault();
		limpiarTodo();
	}));

	// «Filtros» en celular: despliega y pliega los campos.
	if (abrir && campos) {
		abrir.addEventListener('click', () => {
			const abierto = !campos.classList.contains('is-abierto');
			campos.classList.toggle('is-abierto', abierto);
			abrir.setAttribute('aria-expanded', String(abierto));
			const flecha = abrir.querySelector('[data-filtros-flecha]');
			if (flecha) flecha.textContent = abierto ? '▴' : '▾';
		});
	}

	pestanas.forEach((p) => { p.tabIndex = p.getAttribute('aria-selected') === 'true' ? 0 : -1; });

	/* ───────── Precios de lotes por municipio ───────── */
	const precios = document.querySelector('[data-precios]');
	if (precios) {
		const mapa = precios.querySelector('[data-precios-mapa]');
		const nombre = precios.querySelector('[data-precios-nombre]');
		const mostrar = (fila) => {
			if (!mapa || mapa.getAttribute('src') === fila.dataset.mapa) return;
			mapa.setAttribute('src', fila.dataset.mapa);
			mapa.title = 'Mapa de ' + fila.dataset.nombre;
			if (nombre) nombre.textContent = fila.dataset.nombre;
		};
		precios.querySelectorAll('[data-precio-mun]').forEach((fila) => {
			fila.addEventListener('mouseenter', () => mostrar(fila));
			fila.addEventListener('focus', () => mostrar(fila));
			fila.addEventListener('click', () => {
				mostrar(fila);
				const s = select('municipio');
				if (s && [...s.options].some((o) => o.value === fila.dataset.precioMun)) s.value = fila.dataset.precioMun;
				tipo = 'todos';
				aplicar();
				window.scrollTo({ top: 0, behavior: reducir() ? 'auto' : 'smooth' });
			});
		});
	}
}
