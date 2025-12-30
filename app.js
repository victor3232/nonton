// ================== KONFIGURASI API ==================
const API_BASE = 'https://restxdb.onrender.com/api';
const LANG = 'in';

// ================== STATE GLOBAL ==================
let currentMode = 'trending';   // 'trending' | 'latest' | 'random' | 'search'
let currentPage = 1;
let currentSearch = '';

let maxPageTrending = 5;
let maxPageLatest = 10;
let maxPageSearch = 5;

let currentDramas = [];         // list drama yang tampil di beranda
let lastChapters = [];          // cache daftar episode drama aktif

let isLoading = false;          // mencegah loadMore dobel

// info untuk halaman player
let currentDramaTitle = '';
let currentDramaTotalEp = '';


// ================== UTIL ==================
function setLoadingList(text) {
    const list = document.getElementById('drama-list');
    if (!list) return;
    list.classList.add('loading');
    list.innerHTML = text;
}

function clearLoadingList() {
    const list = document.getElementById('drama-list');
    if (!list) return;
    list.classList.remove('loading');
}

// cek apakah home-page sedang aktif (buat infinite scroll)
function isHomeVisible() {
    const home = document.getElementById('home-page');
    return !!home && home.style.display !== 'none';
}


// ================== MODE (TAB) ==================
function setMode(mode, force = false) {
    if (currentMode === mode && !force) return;

    currentMode = mode;
    currentPage = 1;
    currentDramas = [];

    const list = document.getElementById('drama-list');
    if (list) list.innerHTML = '';

    // reset highlight tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (mode === 'trending') document.getElementById('trending-btn')?.classList.add('active');
    if (mode === 'latest') document.getElementById('latest-btn')?.classList.add('active');
    if (mode === 'random') document.getElementById('random-btn')?.classList.add('active');

    // pastikan yang tampil home-page
    const homePage = document.getElementById('home-page');
    const detailPage = document.getElementById('detail-page');
    const playerPage = document.getElementById('player-page');

    if (homePage) homePage.style.display = 'block';
    if (detailPage) detailPage.style.display = 'none';
    if (playerPage) playerPage.style.display = 'none';

    loadMore(true);
}


// ================== LOAD MORE (buat infinite scroll) ==================
function loadMore(reset = false) {
    if (isLoading && !reset) return;
    isLoading = true;

    const btn = document.getElementById('load-more-btn'); // hidden di CSS tapi tetap dipakai
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Memuat selanjutnya...';
    }

    if (reset) {
        setLoadingList('<div class="loading">Loading drama...</div>');
    }

    const finish = () => {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Selanjutnya';
        }
        isLoading = false;
    };

    if (currentMode === 'trending') {
        loadTrending().finally(finish);
    } else if (currentMode === 'latest') {
        loadLatest().finally(finish);
    } else if (currentMode === 'random') {
        loadRandom().finally(finish);
    } else if (currentMode === 'search') {
        loadSearchPage().finally(finish);
    } else {
        finish();
    }
}


// ================== LOAD LIST DRAMA ==================

// Trending: /rank/{page}
async function loadTrending() {
    if (currentPage > maxPageTrending) {
        clearLoadingList();
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/rank/${currentPage}?lang=${LANG}`);
        const json = await res.json();
        const list = (json.data && json.data.list) || [];
        appendDramas(list, { tag: 'Trending' });
        currentPage++;
    } catch (err) {
        const list = document.getElementById('drama-list');
        if (list) {
            list.innerHTML = `<p style="padding:20px;">Error load trending: ${err}</p>`;
        }
    }
}

// Terbaru: /new/{page}
async function loadLatest() {
    if (currentPage > maxPageLatest) {
        clearLoadingList();
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/new/${currentPage}?lang=${LANG}&pageSize=20`);
        const json = await res.json();
        const list = (json.data && json.data.list) || [];
        appendDramas(list, { tag: 'Terbaru' });
        currentPage++;
    } catch (err) {
        const list = document.getElementById('drama-list');
        if (list) {
            list.innerHTML = `<p style="padding:20px;">Error load terbaru: ${err}</p>`;
        }
    }
}

// Random rekomendasi: pakai rank random page
async function loadRandom() {
    try {
        const randomPage = Math.floor(Math.random() * 10) + 1;
        const res = await fetch(`${API_BASE}/rank/${randomPage}?lang=${LANG}`);
        const json = await res.json();
        const list = (json.data && json.data.list) || [];
        appendDramas(list, { tag: 'Rekomendasi' });
    } catch (err) {
        const list = document.getElementById('drama-list');
        if (list) {
            list.innerHTML = `<p style="padding:20px;">Error load rekomendasi: ${err}</p>`;
        }
    }
}


// ================== SEARCH ==================
function searchDrama() {
    const input = document.getElementById('search-input');
    const q = input ? input.value.trim() : '';
    if (!q) {
        alert('Masukkan kata kunci pencarian!');
        return;
    }

    currentMode = 'search';
    currentSearch = q;
    currentPage = 1;
    currentDramas = [];

    const list = document.getElementById('drama-list');
    if (list) list.innerHTML = '';

    // hilangkan highlight tab (mode khusus search)
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const homePage = document.getElementById('home-page');
    const detailPage = document.getElementById('detail-page');
    const playerPage = document.getElementById('player-page');

    if (homePage) homePage.style.display = 'block';
    if (detailPage) detailPage.style.display = 'none';
    if (playerPage) playerPage.style.display = 'none';

    loadMore(true);
}

async function loadSearchPage() {
    if (currentPage > maxPageSearch) {
        clearLoadingList();
        return;
    }
    try {
        const res = await fetch(
            `${API_BASE}/search/${encodeURIComponent(currentSearch)}/${currentPage}?lang=${LANG}`
        );
        const json = await res.json();
        const list = (json.data && json.data.list) || [];
        appendDramas(list, { tag: 'Search' });
        currentPage++;
    } catch (err) {
        const list = document.getElementById('drama-list');
        if (list) {
            list.innerHTML = `<p style="padding:20px;">Error pencarian: ${err}</p>`;
        }
    }
}


// ================== RENDER CARD DRAMA ==================
function appendDramas(dramas, options = {}) {
    clearLoadingList();
    const listEl = document.getElementById('drama-list');
    if (!listEl) return;

    if (!dramas || dramas.length === 0) {
        if (currentDramas.length === 0) {
            listEl.innerHTML = '<p style="padding:20px;">Tidak ada drama ditemukan.</p>';
        }
        return;
    }

    const startIndex = currentDramas.length;
    currentDramas = currentDramas.concat(dramas);

    // bersihkan "Loading drama..." kalau masih ada di HTML lama
    let html = listEl.innerHTML.trim();
    if (html.includes('Loading drama')) {
        html = '';
    }

    dramas.forEach((drama, i) => {
        const idx = startIndex + i;
        const cover = drama.cover || 'https://via.placeholder.com/240x400?text=No+Cover';
        const title = drama.bookName || drama.judul || 'Unknown';
        const totalEp = drama.chapterCount || drama.total_episode || '?';
        const score = drama.score || drama.hot || '';

        html += `
            <article class="drama-card" onclick="showDetail(${idx})">
                <div style="position:relative;">
                    <img src="${cover}" alt="${title}" loading="lazy">
                    <div class="badge-episode">${totalEp} eps</div>
                </div>
                <div class="drama-info">
                    <h3>${title}</h3>
                    <div class="drama-meta">
                        <span>${score ? '⭐ ' + score : '&nbsp;'}</span>
                        <span class="drama-tag">${options.tag || ''}</span>
                    </div>
                </div>
            </article>
        `;
    });

    listEl.innerHTML = html;
}


// ================== NAVIGASI HALAMAN ==================
function backToHome() {
    const homePage = document.getElementById('home-page');
    const detailPage = document.getElementById('detail-page');
    const playerPage = document.getElementById('player-page');

    if (homePage) homePage.style.display = 'block';
    if (detailPage) detailPage.style.display = 'none';
    if (playerPage) playerPage.style.display = 'none';

    const video = document.getElementById('video-player');
    if (video) video.pause();

    const player = document.getElementById('player');
    if (player) player.innerHTML = '';
}

function backToDetail() {
    const detailPage = document.getElementById('detail-page');
    const playerPage = document.getElementById('player-page');

    if (detailPage) detailPage.style.display = 'block';
    if (playerPage) playerPage.style.display = 'none';

    const video = document.getElementById('video-player');
    if (video) video.pause();
}


// ================== DETAIL DRAMA & EPISODE ==================
async function showDetail(index) {
    const drama = currentDramas[index];
    if (!drama) {
        alert('Data drama tidak ditemukan.');
        return;
    }

    const bookId = drama.bookId;
    const title = drama.bookName || drama.judul || 'Unknown';
    const cover = drama.cover || '';
    const totalEpText = drama.chapterCount || drama.total_episode || '??';
    const intro = drama.introduction || drama.deskripsi || 'Tidak ada deskripsi.';

    currentDramaTitle = title;
    currentDramaTotalEp = totalEpText;

    const detailHtml = `
        <div>
            ${cover ? `<img src="${cover}" alt="${title}">` : ''}
        </div>
        <div>
            <h2 class="detail-info-title">${title}</h2>
            <div class="detail-info-meta">
                <span>📺 Total: ${totalEpText} eps</span>
                ${drama.hot ? `<span>🔥 ${drama.hot}</span>` : ''}
            </div>
            <p class="detail-description">${intro}</p>
        </div>
    `;
    const detailEl = document.getElementById('drama-detail');
    if (detailEl) detailEl.innerHTML = detailHtml;

    const epList = document.getElementById('episode-list');
    if (epList) epList.innerHTML = '<div class="loading">Loading episode...</div>';

    const homePage = document.getElementById('home-page');
    const detailPage = document.getElementById('detail-page');
    const playerPage = document.getElementById('player-page');

    if (homePage) homePage.style.display = 'none';
    if (detailPage) detailPage.style.display = 'block';
    if (playerPage) playerPage.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE}/chapters/${bookId}?lang=${LANG}`);
        const json = await res.json();
        const chapters = (json.data && json.data.chapterList) || [];
        lastChapters = chapters;

        if (!chapters.length) {
            if (epList) {
                epList.innerHTML = '<p style="padding:10px;">Tidak ada episode tersedia.</p>';
            }
            return;
        }

        let epHtml = '';
        chapters.forEach((ch, i) => {
            const epNumber = (typeof ch.chapterIndex === 'number')
                ? ch.chapterIndex + 1
                : (i + 1);

            // tombol episode = angka saja, tanpa icon gembok
            epHtml += `
                <button class="episode-btn" onclick="playEpisode('${bookId}', ${ch.chapterIndex}, ${i})">
                    ${epNumber}
                </button>`;
        });
        if (epList) epList.innerHTML = epHtml;

    } catch (err) {
        if (epList) {
            epList.innerHTML = `<p style="padding:10px;">Gagal load episode: ${err}</p>`;
        }
    }
}


// ================== PLAYER (kalau player-page belum ada, tetap main di #player biasa) ==================
async function playEpisode(bookId, chapterIndex, buttonPosition) {
    // highlight tombol episode
    document.querySelectorAll('.episode-btn').forEach(btn => btn.classList.remove('playing'));
    const buttons = document.querySelectorAll('.episode-btn');
    if (buttons[buttonPosition]) buttons[buttonPosition].classList.add('playing');

    const episodeNumber = chapterIndex + 1;

    const homePage = document.getElementById('home-page');
    const detailPage = document.getElementById('detail-page');
    const playerPage = document.getElementById('player-page');

    // kalau ada player-page, pakai halaman itu. kalau tidak, tetap di detail-page.
    if (playerPage) {
        if (homePage) homePage.style.display = 'none';
        if (detailPage) detailPage.style.display = 'none';
        playerPage.style.display = 'block';

        const meta = document.getElementById('player-meta');
        if (meta) {
            meta.innerHTML = `
                <div class="player-meta-ep">Episode ${episodeNumber} / ${currentDramaTotalEp || ''}</div>
                <div class="player-meta-title">${currentDramaTitle || ''}</div>
            `;
        }
    }

    const player = document.getElementById('player');
    if (player) {
        player.innerHTML =
            `<div class="loading">Mengambil link video Episode ${episodeNumber}...</div>`;
    }

    try {
        const res = await fetch(
            `${API_BASE}/watch/${bookId}/${chapterIndex}?lang=${LANG}&source=web_player`
        );
        if (!res.ok) throw 'Server error atau rate limit';

        const json = await res.json();
        if (!json.success || !json.data) throw 'API response tidak success';

        const videoData = json.data;
        const qualities = videoData.qualities || [];
        const defaultQ = qualities.find(q => q.isDefault === 1) || qualities[0];

        const videoUrl = (defaultQ && defaultQ.videoPath) || videoData.videoUrl;
        if (!videoUrl) throw 'URL video tidak ditemukan';

        const playerHtml = `
            <video id="video-player" controls autoplay playsinline>
                <source src="${videoUrl}" type="video/mp4">
                Browser Anda tidak mendukung pemutaran video.
            </video>
        `;
        if (player) player.innerHTML = playerHtml;
    } catch (err) {
        if (player) {
            player.innerHTML = `
                <p style="color:#ff8888;padding:10px;">
                    Gagal memuat video Episode ${episodeNumber}<br>
                    ${err}<br><br>
                    Solusi: Coba episode lain atau refresh halaman (API gratis bisa kena rate limit).
                </p>`;
        }
    }
}


// ================== INIT + INFINITE SCROLL ==================
window.onload = () => {
    setMode('trending', true);   // mulai dari trending
};

// infinite scroll hanya saat home-page kelihatan
window.addEventListener('scroll', () => {
    if (!isHomeVisible()) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.body.offsetHeight - 400;

    if (scrollPosition >= threshold) {
        loadMore();
    }
}); 
