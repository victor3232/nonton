// ================== KONFIGURASI API ==================
const API_BASE = 'https://restxdb.onrender.com/api';
const ANIME_API = 'https://api.sansekai.my.id/api';
const LANG = 'in';

// ================== STATE GLOBAL ==================
let currentMode = 'trending';   // 'trending' | 'latest' | 'random' | 'search' | 'anime'
let currentPage = 1;
let currentSearch = '';

let maxPageTrending = 5;
let maxPageLatest = 10;
let maxPageSearch = 5;

let currentDramas = [];
let lastChapters = [];

let isLoading = false;

// ================== UTIL ==================
function setLoadingList(text) {
    const list = document.getElementById('drama-list');
    list.classList.add('loading');
    list.innerHTML = text;
}

function clearLoadingList() {
    const list = document.getElementById('drama-list');
    list.classList.remove('loading');
}

// ================== MODE (TAB) ==================
function setMode(mode, force = false) {
    if (currentMode === mode && !force) return;

    currentMode = mode;
    currentPage = 1;
    currentDramas = [];
    document.getElementById('drama-list').innerHTML = '';

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (mode === 'trending') document.getElementById('trending-btn')?.classList.add('active');
    if (mode === 'latest') document.getElementById('latest-btn')?.classList.add('active');
    if (mode === 'random') document.getElementById('random-btn')?.classList.add('active');
    if (mode === 'anime') document.getElementById('anime-btn')?.classList.add('active');

    loadMore(true);
}

// ================== LOAD MORE ==================
function loadMore(reset = false) {
    if (isLoading && !reset) return;
    isLoading = true;

    if (reset) {
        setLoadingList('<div class="loading">Loading drama...</div>');
    }

    const finish = () => {
        isLoading = false;
    };

    if (currentMode === 'trending') loadTrending().finally(finish);
    else if (currentMode === 'latest') loadLatest().finally(finish);
    else if (currentMode === 'random') loadRandom().finally(finish);
    else if (currentMode === 'search') loadSearchPage().finally(finish);
    else if (currentMode === 'anime') loadAnime().finally(finish);
}

// ================== DRAMA ==================
// (SEMUA KODE DRAMA ASLI TETAP — TIDAK DIUBAH)

async function loadTrending() {
    if (currentPage > maxPageTrending) return clearLoadingList();
    const res = await fetch(`${API_BASE}/rank/${currentPage}?lang=${LANG}`);
    const json = await res.json();
    appendDramas(json.data?.list || [], { tag: 'Trending' });
    currentPage++;
}

async function loadLatest() {
    if (currentPage > maxPageLatest) return clearLoadingList();
    const res = await fetch(`${API_BASE}/new/${currentPage}?lang=${LANG}&pageSize=20`);
    const json = await res.json();
    appendDramas(json.data?.list || [], { tag: 'Terbaru' });
    currentPage++;
}

async function loadRandom() {
    const randomPage = Math.floor(Math.random() * 10) + 1;
    const res = await fetch(`${API_BASE}/rank/${randomPage}?lang=${LANG}`);
    const json = await res.json();
    appendDramas(json.data?.list || [], { tag: 'Rekomendasi' });
}

function searchDrama() {
    const q = document.getElementById('search-input').value.trim();
    if (!q) return alert('Masukkan kata kunci pencarian!');
    currentMode = 'search';
    currentSearch = q;
    currentPage = 1;
    currentDramas = [];
    document.getElementById('drama-list').innerHTML = '';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    loadMore(true);
}

async function loadSearchPage() {
    if (currentPage > maxPageSearch) return clearLoadingList();
    const res = await fetch(`${API_BASE}/search/${encodeURIComponent(currentSearch)}/${currentPage}?lang=${LANG}`);
    const json = await res.json();
    appendDramas(json.data?.list || [], { tag: 'Search' });
    currentPage++;
}

// ================== ANIME START ==================
async function loadAnime() {
    try {
        const res = await fetch(`${ANIME_API}/anime/latest`);
        const data = await res.json();

        const mapped = data.map(a => ({
            __isAnime: true,
            animeId: a.id,
            bookName: a.judul,
            cover: a.cover,
            chapterCount: a.total_eps || '?',
            introduction: a.sinopsis || ''
        }));

        appendDramas(mapped, { tag: 'Anime' });
    } catch (e) {
        setLoadingList('Gagal load anime');
    }
}
// ================== ANIME END ==================

// ================== CARD (TETAP) ==================
function appendDramas(dramas, options = {}) {
    clearLoadingList();
    const listEl = document.getElementById('drama-list');
    const startIndex = currentDramas.length;
    currentDramas = currentDramas.concat(dramas);

    let html = listEl.innerHTML.includes('Loading') ? '' : listEl.innerHTML;

    dramas.forEach((drama, i) => {
        const idx = startIndex + i;
        html += `
        <article class="drama-card" onclick="showDetail(${idx})">
            <div style="position:relative;">
                <img src="${drama.cover}" loading="lazy">
                <div class="badge-episode">${drama.chapterCount} eps</div>
            </div>
            <div class="drama-info">
                <h3>${drama.bookName}</h3>
                <div class="drama-meta">
                    <span></span>
                    <span class="drama-tag">${options.tag || ''}</span>
                </div>
            </div>
        </article>`;
    });

    listEl.innerHTML = html;
}

// ================== DETAIL ==================
async function showDetail(index) {
    const item = currentDramas[index];
    if (!item) return alert('Data tidak ditemukan');

    if (item.__isAnime) return showAnimeDetail(item);

    // ===== DRAMA ASLI =====
    const bookId = item.bookId;
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('detail-page').style.display = 'block';

    document.getElementById('drama-detail').innerHTML = `
        <img src="${item.cover}">
        <h2>${item.bookName}</h2>
        <p>${item.introduction || ''}</p>
    `;

    const res = await fetch(`${API_BASE}/chapters/${bookId}?lang=${LANG}`);
    const json = await res.json();
    lastChapters = json.data?.chapterList || [];

    document.getElementById('episode-list').innerHTML = lastChapters.map((c, i) =>
        `<div class="episode-btn" onclick="playEpisode('${bookId}', ${c.chapterIndex}, ${i})">Eps ${i + 1}</div>`
    ).join('');

    playEpisode(bookId, lastChapters[0].chapterIndex, 0);
}

// ================== ANIME DETAIL ==================
async function showAnimeDetail(item) {
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('detail-page').style.display = 'block';

    const res = await fetch(`${ANIME_API}/anime/detail?id=${item.animeId}`);
    const data = await res.json();

    document.getElementById('drama-detail').innerHTML = `
        <img src="${data.cover}">
        <h2>${data.judul}</h2>
        <p>${data.sinopsis}</p>
    `;

    document.getElementById('episode-list').innerHTML = data.chapter.map((ep, i) =>
        `<div class="episode-btn" onclick="playAnime('${ep.url}', ${i})">Eps ${i + 1}</div>`
    ).join('');

    playAnime(data.chapter[0].url, 0);
}

// ================== PLAY ANIME ==================
async function playAnime(chapterUrlId, idx) {
    document.querySelectorAll('.episode-btn').forEach(b => b.classList.remove('playing'));
    document.querySelectorAll('.episode-btn')[idx]?.classList.add('playing');

    document.getElementById('player').innerHTML = '<div class="loading">Loading video...</div>';

    const res = await fetch(`${ANIME_API}/anime/getvideo?chapterUrlId=${chapterUrlId}&reso=720p`);
    const video = await res.json();

    document.getElementById('player').innerHTML = `
        <video controls autoplay playsinline>
            <source src="${video.url}" type="video/mp4">
        </video>`;
}

// ================== INIT ==================
window.onload = () => setMode('trending', true);

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) {
        loadMore();
    }
});
