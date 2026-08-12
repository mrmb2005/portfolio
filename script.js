/* ---------------- reduced-motion flag ---------------- */
const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- scroll reveal ---------------- */
(function(){
  const els = document.querySelectorAll('.reveal');
  if(REDUCE_MOTION){ els.forEach(el=>el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold:0.12 });
  els.forEach(el=>io.observe(el));
})();

/* ---------------- active nav link on scroll ---------------- */
(function(){
  const links = document.querySelectorAll('.nav-links a');
  const map = {};
  links.forEach(a=>{
    const section = document.querySelector(a.getAttribute('href'));
    if(section) map[section.id] = a;
  });
  const ids = Object.keys(map);
  if(!ids.length) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        links.forEach(l=>l.classList.remove('active'));
        const link = map[entry.target.id];
        if(link) link.classList.add('active');
      }
    });
  }, { threshold:0.4 });
  ids.forEach(id=>{
    const el = document.getElementById(id);
    if(el) io.observe(el);
  });
})();

/* ---------------- click-to-copy contact details ---------------- */
(function(){
  const toast = document.getElementById('copyToast');
  let toastTimer;
  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toast.classList.remove('show'), 1800);
  }
  function copyValue(el){
    const val = el.dataset.copy;
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(val).then(()=> showToast('Copied: ' + val)).catch(()=> showToast('Copy failed — select manually'));
    } else {
      showToast('Copy not supported — select manually');
    }
  }
  document.querySelectorAll('.copyable').forEach(el=>{
    el.addEventListener('click', ()=> copyValue(el));
    el.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); copyValue(el); }
    });
  });
})();

/* ---------------- Pakistan field map (Leaflet + GeoJSON) ---------------- */
(function(){
  const mapEl = document.getElementById('pakistanMap');
  const scrollTip = document.getElementById('mapScrollTip');
  if(!mapEl || typeof L === 'undefined') return;

  const map = L.map('pakistanMap', {
    attributionControl: false,
    zoomControl: true,
    scrollWheelZoom: false,
    minZoom: 4,
    maxZoom: 9
  }).setView([30.3753, 69.3451], 5);

  L.control.attribution({ prefix: false }).addTo(map).addAttribution('District boundaries via GeoJSON');

  const loadingNote = document.createElement('div');
  loadingNote.style.cssText = 'position:absolute;bottom:10px;left:10px;z-index:500;font-family:var(--mono);font-size:10px;color:var(--muted);background:#fff;padding:5px 10px;border-radius:4px;border:1px solid var(--line);';
  loadingNote.textContent = 'Loading boundary data…';
  mapEl.appendChild(loadingNote);

  scrollTip.classList.add('show');
  mapEl.addEventListener('click', ()=>{
    map.scrollWheelZoom.enable();
    scrollTip.style.display = 'none';
  });
  mapEl.addEventListener('mouseleave', ()=> map.scrollWheelZoom.disable());

  fetch('data/pakistan.geojson')
    .then(res => { if(!res.ok) throw new Error('not found'); return res.json(); })
    .then(data => {
      loadingNote.remove();
      const boundary = L.geoJSON(data, {
        style: {
          color: '#d63384',
          weight: 0.8,
          fillColor: '#f9e0ef',
          fillOpacity: 0.55
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          const district = props.NAME_3 || props.NAME_2 || props.NAME_1 || '';
          const province = props.NAME_1 || '';
          if(district){
            layer.bindTooltip(`${district}${province && province !== district ? ' — ' + province : ''}`, {
              className: 'map-tip', sticky: true
            });
          }
          layer.on('mouseover', () => layer.setStyle({ weight: 2, color: '#e05fa8', fillOpacity: 0.65 }));
          layer.on('mouseout', () => layer.setStyle({ weight: 0.8, color: '#d63384', fillOpacity: 0.55 }));
        }
      }).addTo(map);
      try{ map.fitBounds(boundary.getBounds(), { padding: [20, 20] }); }catch(e){}
    })
    .catch(()=>{
      loadingNote.textContent = (location.protocol === 'file:')
        ? 'Boundary blocked — open this via a local server, e.g. "python3 -m http.server"'
        : 'pakistan.geojson not found — showing markers only';
    });

  const locations = [
    { lat: 31.5497, lon: 74.3436, label: 'NESPAK — GIS Engineer', type: 'work' },
    { lat: 31.4707, lon: 74.4066, label: 'CWIT, LUMS — Research Intern', type: 'work' },
    { lat: 33.6425, lon: 72.9930, label: 'NUST — Geoinformatics Eng.', type: 'edu' },
    { lat: 31.5800, lon: 74.3200, label: 'LULC & AQI Mapping — Lahore', type: 'project' },
    { lat: 34.6000, lon: 73.1000, label: 'Earthquake Mapping — Northern Areas', type: 'project' },
    { lat: 31.0500, lon: 73.9500, label: 'Crop Classification — Sukheki & Jalalpur', type: 'project' }
  ];
  const typeColor = { work: '#d63384', edu: '#f07ab1', project: '#b52a6f' };
  locations.forEach(loc=>{
    const marker = L.circleMarker([loc.lat, loc.lon], {
      radius: 6, color: typeColor[loc.type], fillColor: typeColor[loc.type], fillOpacity: 0.85, weight: 1.5
    }).addTo(map);
    marker.bindTooltip(loc.label, { direction: 'top', className: 'map-tip', offset: [0, -6] });
  });
})();

/* ---------------- project data + card render ---------------- */
(function(){
  const projects = [
    {
      title: "Land Use / Land Cover Mapping, Lahore",
      year: "2024 — 2050 (forecast)",
      desc: "Multi-temporal satellite analysis of how Lahore's land is used and covered — with forecast models running out to 2030 and 2050, built in Google Earth Engine.",
      tags: ["Google Earth Engine", "LULC", "Forecasting"],
      category: "Remote Sensing"
    },
    {
      title: "Pakistan Flood Risk Dashboard",
      year: "2022 Floods — 2050 (forecast)",
      desc: "A Big Data and AI dashboard for the 2022 floods — forecasting flood risk for 2030 and 2050 and answering questions through an LLM-powered chatbot.",
      tags: ["Big Data", "AI / LLM", "Flood Risk"],
      category: "AI & Big Data"
    },
    {
      title: "Lahore Air Quality Index Dashboard",
      year: "Ongoing",
      desc: "PostGIS-driven spatial analysis of air quality in Lahore — mapping high-risk zones, safe areas, and predicted AQI trends on an interactive dashboard.",
      tags: ["PostGIS", "AQI", "Spatial Analysis"],
      category: "Spatial Analysis"
    },
    {
      title: "Explore Pakistan — Travel Platform",
      year: "Full-Stack Web GIS",
      desc: "A full-stack Web GIS platform for tourism — managing destinations, hotels, trips, bookings, and reviews in one place, with an AI travel assistant.",
      tags: ["Web GIS", "Full-Stack", "Tourism"],
      category: "Web GIS"
    },
    {
      title: "Earthquake Mapping — Northern Pakistan",
      year: "1970 — 2025",
      desc: "Seismic mapping of earthquake events from 1970–2025 across Northern Pakistan — revealing fault-line clusters and high-risk zones for the NDMA Disaster Early Warning Tech Expo.",
      tags: ["Seismic Mapping", "Disaster Risk"],
      category: "Disaster Risk"
    },
    {
      title: "Crop Classification with Machine Learning",
      year: "Sukheki & Jalalpur",
      desc: "Machine learning classifies crop types across Sukheki and Jalalpur, producing vegetative and non-vegetative maps for both regions.",
      tags: ["Machine Learning", "Remote Sensing"],
      category: "Machine Learning",
      images: [
        { src: "images/sukheki-classification.jpg", alt: "Sukheki crop classification map" },
        { src: "images/jalalpur-classification.jpg", alt: "Jalalpur crop classification map" }
      ]
    }
  ];

  const grid = document.getElementById('projGrid');
  projects.forEach(p=>{
    const card = document.createElement('div');
    card.className = 'proj-card reveal';
    card.dataset.category = p.category;

    let imagesHtml = '';
    if(p.images && p.images.length){
      imagesHtml = `
        <div class="proj-map">
          ${p.images.map(i=>`<img src="${i.src}" alt="${i.alt}" loading="lazy">`).join('')}
        </div>`;
    }

    card.innerHTML = `
      ${imagesHtml}
      <div class="proj-cat">${p.category}</div>
      <div class="proj-title">${p.title}</div>
      <div class="proj-year">${p.year}</div>
      <p class="proj-desc">${p.desc}</p>
      <div class="tag-row">${p.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
    `;
    grid.appendChild(card);
  });

  // reveal observer for injected cards
  if(REDUCE_MOTION){
    document.querySelectorAll('.proj-card.reveal').forEach(el=>el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){ entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold:0.12 });
    document.querySelectorAll('.proj-card.reveal').forEach(el=>io.observe(el));
  }

  // build filter bar
  const categories = ["All", ...new Set(projects.map(p=>p.category))];
  const filterBar = document.getElementById('filterBar');
  categories.forEach(cat=>{
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (cat === 'All' ? ' active' : '');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', cat === 'All' ? 'true' : 'false');
    btn.textContent = cat;
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.filter-btn').forEach(b=>{
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      document.querySelectorAll('.proj-card').forEach(card=>{
        const match = cat === 'All' || card.dataset.category === cat;
        card.style.display = match ? '' : 'none';
      });
    });
    filterBar.appendChild(btn);
  });
})();

/* ---------------- sync footer CV link to the hero CV button ---------------- */
(function(){
  const heroLink = document.getElementById('heroCvLink');
  const footerLink = document.getElementById('footerCvLink');
  if(heroLink && footerLink){
    footerLink.href = heroLink.href;
  }
})();

/* ---------------- contact form (FormSubmit, no backend) ---------------- */
(function(){
  const form = document.getElementById('contactForm');
  const note = document.getElementById('cfNote');
  const submitBtn = document.getElementById('cfSubmit');
  if(!form) return;

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    try{
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if(res.ok){
        form.reset();
        note.textContent = 'Message sent — thanks, I\'ll get back to you soon.';
        note.style.color = 'var(--accent)';
        submitBtn.textContent = 'Sent ✓';
      } else {
        throw new Error('Request failed');
      }
    } catch(err){
      note.textContent = 'Something went wrong — email me directly instead.';
      note.style.color = 'var(--danger)';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });
})();
