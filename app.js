// ================== KONFIGURASI API ==================
const API_BASE = 'https://restxdb.onrender.com/api';
const LANG = 'in';

// ================== STATE GLOBAL ==================
let currentMode = 'trending';   // 'trending' | 'latest' | 'random' | 'search'
let currentPage = 1;
let currentSearch = '';

let maxPageTrending = 5;        // boleh dinaikkan
let maxPageLatest = 10;
let maxPageSearch = 5;

let currentDramas = [];         // daftar drama yang sedang ditampilkan
let lastChapters = [];          // chapter list untuk detail

let isLoading = false;          // mencegah loadMore dipanggil berkali-kali

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
    // kalau mode sama dan tidak dipaksa, tidak perlu reload
    if (currentMode === mode && !force) return;

    currentMode = mode;
    currentPage = 1;
    currentDramas = [];
    document.getElementById('drama-list').innerHTML = '';

    // reset highlight tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (mode === 'trending') document.getElementById('trending-btn').classList.add('active');
    if (mode === 'latest') document.getElementById('latest-btn').classList.add('active');
    if (mode === 'random') document.getElementById('random-btn').classList.add('active');

    // mulai load data mode baru
    loadMore(true);
}

// ================== LOAD MORE (DIPAKAI INFINITE SCROLL) ==================
function loadMore(reset = false) {
    // kalau lagi loading dan ini bukan reset pertama → jangan jalan
    if (isLoading && !reset) return;
    isLoading = true;

    const btn = document.getElementById('load-more-btn'); // tombol disembunyikan di CSS, tapi tetap dicek
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
    }
}

// ================== LIST DRAMA: TRENDING / TERBARU / RANDOM / SEARCH ==================

// Trending = /rank/{page}
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
        document.getElementById('drama-list').innerHTML =
            `<p style="padding:20px;">Error load trending: ${err}</p>`;
    }
}

// Terbaru = /new/{page}
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
        document.getElementById('drama-list').innerHTML =
            `<p style="padding:20px;">Error load terbaru: ${err}</p>`;
    }
}

// Random / rekomendasi (gunakan rank random page)
async function loadRandom() {
    try {
        const randomPage = Math.floor(Math.random() * 10) + 1;
        const res = await fetch(`${API_BASE}/rank/${randomPage}?lang=${LANG}`);
        const json = await res.json();
        const list = (json.data && json.data.list) || [];
        appendDramas(list, { tag: 'Rekomendasi' });
    } catch (err) {
        document.getElementById('drama-list').innerHTML =
            `<p style="padding:20px;">Error load rekomendasi: ${err}</p>`;
    }
}

// Pencarian
function searchDrama() {
    const q = document.getElementById('search-input').value.trim();
    if (!q) return alert('Masukkan kata kunci pencarian!');

    currentMode = 'search';
    currentSearch = q;
    currentPage = 1;
    currentDramas = [];
    document.getElementById('drama-list').innerHTML = '';

    // hilangkan highlight tab (karena ini mode search)
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    loadMore(true);
}

// Load page pencarian berikutnya
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
        document.getElementById('drama-list').innerHTML =
            `<p style="padding:20px;">Error pencarian: ${err}</p>`;
    }
}

// Tambahkan drama ke grid
function appendDramas(dramas, options = {}) {
    clearLoadingList();
    const listEl = document.getElementById('drama-list');

    if (!dramas || dramas.length === 0) {
        if (currentDramas.length === 0) {
            listEl.innerHTML = '<p style="padding:20px;">Tidak ada drama ditemukan.</p>';
        }
        return;
    }

    const startIndex = currentDramas.length;
    currentDramas = currentDramas.concat(dramas);

    let html = listEl.innerHTML;
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

// ================== DETAIL & EPISODE ==================
function backToHome() {
    document.getElementById('home-page').style.display = 'block';
    document.getElementById('detail-page').style.display = 'none';
    document.getElementById('player').innerHTML = '';
}

// Tampilkan detail drama dan ambil daftar episode
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
    document.getElementById('drama-detail').innerHTML = detailHtml;

    document.getElementById('episode-list').innerHTML =
        '<div class="loading">Loading episode...</div>';
    document.getElementById('player').innerHTML = '';

    document.getElementById('home-page').style.display = 'none';
    document.getElementById('detail-page').style.display = 'block';

    try {
        const res = await fetch(`${API_BASE}/chapters/${bookId}?lang=${LANG}`);
        const json = await res.json();
        const chapters = (json.data && json.data.chapterList) || [];
        lastChapters = chapters;

        if (!chapters.length) {
            document.getElementById('episode-list').innerHTML =
                '<p style="padding:10px;">Tidak ada episode tersedia.</p>';
            return;
        }

        let epHtml = '';
        chapters.forEach((ch, i) => {
            const epNumber = (typeof ch.chapterIndex === 'number')
                ? ch.chapterIndex + 1
                : (i + 1);
            const isVip = ch.isCharge === 1;
            epHtml += `
                <div class="episode-btn" onclick="playEpisode('${bookId}', ${ch.chapterIndex}, ${i})">
                    Eps ${epNumber}${isVip ? ' 🔒' : ''}
                </div>`;
        });
        document.getElementById('episode-list').innerHTML = epHtml;

        // auto play episode pertama
        playEpisode(bookId, chapters[0].chapterIndex, 0);
    } catch (err) {
        document.getElementById('episode-list').innerHTML =
            `<p style="padding:10px;">Gagal load episode: ${err}</p>`;
    }
}

// Play episode via endpoint watch
async function playEpisode(bookId, chapterIndex, buttonPosition) {
    // highlight episode aktif
    document.querySelectorAll('.episode-btn').forEach(btn => btn.classList.remove('playing'));
    const buttons = document.querySelectorAll('.episode-btn');
    if (buttons[buttonPosition]) buttons[buttonPosition].classList.add('playing');

    const episodeNumber = chapterIndex + 1;
    document.getElementById('player').innerHTML =
        `<div class="loading">Mengambil link video Episode ${episodeNumber}...</div>`;

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
            <h3 style="margin-bottom:8px;font-size:15px;">Sedang memutar: Episode ${episodeNumber}</h3>
            <video id="video-player" controls autoplay playsinline>
                <source src="${videoUrl}" type="video/mp4">
                Browser Anda tidak mendukung pemutaran video.
            </video>
        `;
        document.getElementById('player').innerHTML = playerHtml;
    } catch (err) {
        document.getElementById('player').innerHTML = `
            <p style="color:#ff8888;padding:10px;">
                Gagal memuat video Episode ${episodeNumber}<br>
                ${err}<br><br>
                Solusi: Coba episode lain atau refresh halaman (API gratis bisa kena rate limit).
            </p>`;
    }
}

// ================== INIT & INFINITE SCROLL ==================
window.onload = () => {
    setMode('trending', true); // load trending saat pertama dibuka
};

// kalau posisi scroll mendekati bawah, otomatis loadMore()
window.addEventListener('scroll', () => {
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.body.offsetHeight - 400; // 400px dari bawah

    if (scrollPosition >= threshold) {
        loadMore();
    }
}); 
