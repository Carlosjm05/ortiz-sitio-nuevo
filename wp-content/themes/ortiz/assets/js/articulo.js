/**
 * Artículo: barra de lectura, índice «En esta guía» con la sección activa, «Copiar enlace» y la calculadora por m².
 * Sin JS: el índice son enlaces normales, la calculadora muestra su estado inicial (pintado por el servidor) y
 * «Copiar enlace» no aparece. Lógica de referencia: readProg, tocAct, share y cTipos/cSectores/cRange/cMatch de
 * Guia Precio Lote Melgar.dc.html (template-parts/articulo/calculadora.php calcula lo mismo en PHP).
 */

const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const curva = 'cubic-bezier(.2,.7,.2,1)';
const suave = (el) => { if (el && !reducir() && el.animate) el.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: curva }); };

/* ───────── Barra de lectura e índice ───────── */
const barra = document.querySelector('[data-art-prog]');
const enlaces = [...document.querySelectorAll('[data-art-indice]')];
const ids = [...new Set(enlaces.map((a) => a.dataset.artIndice))];
let activo = ids[0] || '';
let raf = 0;
const alBajar = () => {
	raf = 0;
	const h = document.documentElement;
	if (barra) barra.style.width = (Math.min(1, h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100).toFixed(1) + '%';
	let act = ids[0] || '';
	ids.forEach((id) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < 160) act = id; });
	if (act !== activo) {
		activo = act;
		enlaces.forEach((a) => {
			const on = a.dataset.artIndice === act;
			a.classList.toggle('is-activo', on);
			if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
		});
	}
};
if (barra || ids.length) {
	window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(alBajar); }, { passive: true });
	alBajar();
}
// En el desplegable, elegir una sección lo cierra.
document.querySelectorAll('.art-indice-mini [data-art-indice]').forEach((a) => a.addEventListener('click', () => {
	const d = a.closest('details');
	if (d) d.open = false;
}));

/* ───────── Copiar enlace ───────── */
document.querySelectorAll('[data-art-copiar]').forEach((b) => {
	const original = b.textContent;
	b.hidden = false;
	b.addEventListener('click', async () => {
		const url = b.dataset.artCopiar || window.location.href;
		try {
			await navigator.clipboard.writeText(url);
		} catch (_) {
			const t = document.createElement('textarea');
			t.value = url;
			t.setAttribute('readonly', '');
			t.style.position = 'fixed';
			t.style.opacity = '0';
			document.body.appendChild(t);
			t.select();
			try { document.execCommand('copy'); } catch (__) { /* sin portapapeles */ }
			t.remove();
		}
		b.textContent = b.dataset.copiado || original;
		clearTimeout(b._t);
		b._t = setTimeout(() => { b.textContent = original; }, 2500);
	});
});

/* ───────── Calculadora por m² ───────── */
const miles = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fmtM = (n) => '$' + miles(n / 1e6) + 'M';
const fmtK = (n) => '$' + miles(n / 1e3) + ' mil';
const reemplazar = (t, v) => Object.keys(v).reduce((s, k) => s.split('{' + k + '}').join(v[k]), t || '');

document.querySelectorAll('[data-art-calc]').forEach((sec) => {
	let d;
	try { d = JSON.parse(sec.querySelector('[data-calc-datos]').textContent); } catch (_) { return; }
	if (!d || !d.tipos || !d.tipos.length) return;
	const $ = (s) => sec.querySelector(s);
	const tiposBtn = [...sec.querySelectorAll('[data-calc-tipo]')];
	const sectores = $('[data-calc-sectores]');
	const rango = $('[data-calc-area]');
	const proys = [...sec.querySelectorAll('[data-calc-proy]')];
	const wa = $('[data-calc-wa]');
	const barato = (t) => Object.keys(t.precios).reduce((a, b) => (t.precios[b][0] < t.precios[a][0] ? b : a));

	const inicial = tiposBtn.findIndex((b) => b.getAttribute('aria-pressed') === 'true');
	const pedido = sectores.querySelector('[aria-pressed="true"]');
	const est = { tipo: Math.max(0, inicial), sector: pedido ? pedido.dataset.calcSector : '', area: +rango.value };

	const pintarSectores = () => {
		const t = d.tipos[est.tipo];
		const nombres = Object.keys(t.precios);
		const actuales = [...sectores.querySelectorAll('[data-calc-sector]')].map((b) => b.dataset.calcSector);
		if (nombres.join('|') !== actuales.join('|')) {
			sectores.textContent = '';
			nombres.forEach((s) => {
				const b = document.createElement('button');
				b.type = 'button';
				b.className = 'calc__pill';
				b.dataset.calcSector = s;
				b.textContent = s;
				sectores.appendChild(b);
			});
		}
		sectores.querySelectorAll('[data-calc-sector]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.calcSector === est.sector)));
	};

	const calcular = () => {
		const t = d.tipos[est.tipo];
		if (!t.precios[est.sector]) est.sector = barato(t);
		const area = Math.min(t.max, Math.max(t.min, est.area));
		const [pl, ph] = t.precios[est.sector];
		const lo = area * pl;
		const hi = area * ph;
		const mid = (lo + hi) / 2;
		const ini = mid * d.pct / 100;

		tiposBtn.forEach((b, i) => b.setAttribute('aria-pressed', String(i === est.tipo)));
		pintarSectores();
		rango.min = t.min;
		rango.max = t.max;
		rango.value = area;
		$('[data-calc-area-txt]').textContent = miles(area) + ' m²';
		$('[data-calc-min]').textContent = miles(t.min) + ' m²';
		$('[data-calc-max]').textContent = miles(t.max) + ' m²';
		$('[data-calc-rango]').textContent = fmtM(lo) + ' – ' + fmtM(hi);
		$('[data-calc-m2]').textContent = reemplazar(d.textos.m2, { desde: fmtK(pl), hasta: fmtK(ph), sector: est.sector });
		$('[data-calc-ini]').textContent = fmtM(ini);
		$('[data-calc-cuotas]').textContent = reemplazar(d.textos.cuotas, { n: String(d.cuotas), valor: fmtM(ini / d.cuotas) });

		// Los 2 proyectos que más se acercan: primero los del mismo tipo, luego el precio más cercano al medio.
		const orden = d.proyectos
			.map((p, i) => ({ i, g: p.ref === t.ref ? 0 : 1, dist: Math.abs(p.precio - mid), ok: p.precio > 0 }))
			.filter((p) => p.ok)
			.sort((a, b) => a.g - b.g || a.dist - b.dist || a.i - b.i)
			.slice(0, 2)
			.map((p) => p.i);
		proys.forEach((a) => {
			const k = orden.indexOf(+a.dataset.calcProy);
			const ver = k >= 0;
			if (ver && a.hidden) suave(a);
			a.hidden = !ver;
			a.style.order = ver ? String(k) : '';
		});

		if (wa && d.wa) {
			wa.href = d.wa + '?text=' + encodeURIComponent(reemplazar(d.textos.wa, { tipo: t.nombre.toLowerCase(), area: String(area), sector: est.sector, desde: fmtM(lo), hasta: fmtM(hi) }));
		}
	};

	tiposBtn.forEach((b) => b.addEventListener('click', () => {
		const i = +b.dataset.calcTipo;
		if (i === est.tipo) return;
		est.tipo = i;
		est.area = d.tipos[i].inicial;
		calcular();
	}));
	sectores.addEventListener('click', (e) => {
		const b = e.target.closest('[data-calc-sector]');
		if (!b || b.dataset.calcSector === est.sector) return;
		est.sector = b.dataset.calcSector;
		calcular();
	});
	rango.addEventListener('input', () => { est.area = +rango.value; calcular(); });
	calcular();
});
