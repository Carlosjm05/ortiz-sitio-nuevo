/**
 * Conóceme: historia en capítulos (pasa sola cada 6,5 s, se pausa con el cursor o el foco), ventana de los reels
 * de «Un día conmigo» y filtro del equipo por zona. Sin JS: se leen todos los capítulos, el reel abre el video en
 * otra pestaña y se ven todos los asesores. Lógica de referencia: HIT/hTabs/hNext, dReels y asZonas de Conoceme.dc.html.
 */

const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const curva = 'cubic-bezier(.2,.7,.2,1)';
const aparecer = (el) => { if (el && !reducir() && el.animate) el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: curva }); };

/* ───────── Historia en capítulos ───────── */
const caja = document.querySelector('[data-historia]');
if (caja) {
	const tabs = [...caja.querySelectorAll('[data-htab]')];
	const paneles = [...caja.querySelectorAll('[data-hpanel]')];
	const fotos = [...caja.querySelectorAll('[data-hfoto]')];
	const sigTxt = caja.querySelector('[data-hnext-txt]');
	const titulos = paneles.map((p) => (p.querySelector('.hpanel__titulo') || {}).textContent || '');
	const total = paneles.length;
	const DURACION = 6500;
	let actual = 0;
	let anim = null;
	let pausado = false;

	caja.classList.add('is-js');
	caja.querySelectorAll('[data-htabs], [data-hctrl]').forEach((el) => { el.hidden = false; });

	const correr = () => {
		if (anim) { anim.cancel(); anim = null; }
		const lleno = tabs[actual] && tabs[actual].querySelector('.htab__lleno');
		if (!lleno || total < 2 || reducir() || !lleno.animate) return;
		anim = lleno.animate([{ width: '0%' }, { width: '100%' }], { duration: DURACION, easing: 'linear', fill: 'forwards' });
		anim.onfinish = () => ir(actual + 1, false);
		if (pausado) anim.pause();
	};

	const ir = (i, foco) => {
		actual = (i + total) % total;
		tabs.forEach((t, k) => {
			const on = k === actual;
			t.setAttribute('aria-selected', String(on));
			t.tabIndex = on ? 0 : -1;
			t.classList.toggle('is-pasado', k < actual);
		});
		paneles.forEach((p, k) => {
			const ver = k === actual;
			if (ver && p.hidden) aparecer(p);
			p.hidden = !ver;
		});
		fotos.forEach((f, k) => f.classList.toggle('is-activo', k === actual));
		if (sigTxt) sigTxt.textContent = actual === total - 1 ? (caja.dataset.volver || titulos[0]) : titulos[actual + 1];
		if (foco && tabs[actual]) tabs[actual].focus();
		correr();
	};

	tabs.forEach((t, k) => {
		t.addEventListener('click', () => ir(k, false));
		t.addEventListener('keydown', (e) => {
			if (e.key === 'ArrowRight') { e.preventDefault(); ir(actual + 1, true); }
			if (e.key === 'ArrowLeft') { e.preventDefault(); ir(actual - 1, true); }
			if (e.key === 'Home') { e.preventDefault(); ir(0, true); }
			if (e.key === 'End') { e.preventDefault(); ir(total - 1, true); }
		});
	});
	const prev = caja.querySelector('[data-hprev]');
	const next = caja.querySelector('[data-hnext]');
	if (prev) prev.addEventListener('click', () => ir(actual - 1, false));
	if (next) next.addEventListener('click', () => ir(actual + 1, false));

	// Pausa mientras el cursor o el foco están en la historia, y mientras no se ve en pantalla.
	const pausar = () => { pausado = true; if (anim) anim.pause(); };
	const seguir = () => { pausado = false; if (anim && anim.playState === 'paused') anim.play(); };
	caja.addEventListener('mouseenter', pausar);
	caja.addEventListener('mouseleave', () => { if (!caja.contains(document.activeElement)) seguir(); });
	caja.addEventListener('focusin', pausar);
	caja.addEventListener('focusout', (e) => { if (!caja.contains(e.relatedTarget) && !caja.matches(':hover')) seguir(); });
	if ('IntersectionObserver' in window) {
		new IntersectionObserver(([e]) => {
			if (!anim) return;
			if (e.isIntersecting && !pausado) anim.play(); else anim.pause();
		}, { threshold: 0.25 }).observe(caja);
	}

	ir(0, false);
}

/* ───────── Ventana del reel ───────── */
const dReel = document.querySelector('[data-dialogo-reel]');
if (dReel) {
	const video = dReel.querySelector('[data-reel-video]');
	let origen = null;
	const cerrar = () => {
		if (dReel.open) dReel.close();
		video.replaceChildren();
		document.documentElement.classList.remove('sin-scroll');
		if (origen && origen.focus && document.contains(origen)) origen.focus({ preventScroll: true });
		origen = null;
	};
	// No se confía solo en el evento «close» (algunos navegadores no lo disparan): se limpia al cerrar con el botón,
	// al tocar afuera y con Esc; «close» queda de respaldo.
	dReel.addEventListener('click', (e) => { if (e.target === dReel || e.target.closest('[data-cerrar]')) cerrar(); });
	dReel.addEventListener('cancel', (e) => { e.preventDefault(); cerrar(); });
	dReel.addEventListener('close', () => { if (video.firstChild) cerrar(); });

	document.querySelectorAll('[data-reel]').forEach((a) => a.addEventListener('click', (e) => {
		const url = a.dataset.video || '';
		if (!url || !dReel.showModal) return;
		e.preventDefault();
		origen = a;
		video.replaceChildren();
		if (/\.mp4(\?|$)/i.test(url)) {
			const v = document.createElement('video');
			v.src = url; v.controls = true; v.autoplay = true; v.playsInline = true;
			video.append(v);
		} else {
			const f = document.createElement('iframe');
			f.src = url;
			f.title = a.dataset.titulo || 'Reel';
			f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
			f.allowFullscreen = true;
			video.append(f);
		}
		dReel.querySelector('[data-reel-meta]').textContent = a.dataset.meta || '';
		dReel.querySelector('[data-reel-titulo]').textContent = a.dataset.titulo || '';
		dReel.showModal();
		document.documentElement.classList.add('sin-scroll');
		aparecer(dReel.firstElementChild);
	}));
}

/* ───────── Equipo por zona ───────── */
const zonas = document.querySelector('[data-zonas]');
if (zonas) {
	const chips = [...zonas.querySelectorAll('[data-zona]')];
	const tarjetas = [...document.querySelectorAll('.asesor-c[data-zona]')];
	chips.forEach((c) => c.addEventListener('click', () => {
		const z = c.dataset.zona;
		chips.forEach((o) => o.setAttribute('aria-pressed', String(o === c)));
		tarjetas.forEach((t) => {
			const ver = z === 'todas' || t.dataset.zona === 'todas' || t.dataset.zona === z;
			if (ver && t.hidden) aparecer(t);
			t.hidden = !ver;
		});
	}));
}
