// ===== HEADER SEARCH MODULE =====

// ===== CONSTANTS =====
const SONGS_JSON_PATH = "./assets/music_data/songs.json";
const SEARCH_PAGE_PATH = "./timkiem.html";

// ===== UTILITY FUNCTIONS =====
/**
 * Safely executes a function with error handling
 * @param {Function} fn - Function to execute
 * @param {string} context - Context description for error logging
 * @returns {*} Function result or null on error
 */
function safeExecute(fn, context = "operation") {
    try {
        return fn();
    } catch (error) {
        console.error(`Error in ${context}:`, error);
        return null;
    }
}

/**
 * Normalizes text for search (removes diacritics)
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeSearchText(text) {
    return (
        safeExecute(() => {
            return String(text || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .trim();
        }, "normalizeSearchText") ??
        String(text || "")
            .toLowerCase()
            .trim()
    );
}

/**
 * Configures search input attributes
 * @param {HTMLElement} input - Search input element
 */
function configureSearchInput(input) {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");
}

/**
 * Loads songs data from JSON
 * @returns {Promise<Array>} Array of songs
 */
async function loadSongsData() {
    return (
        safeExecute(async () => {
            const response = await fetch(SONGS_JSON_PATH, {
                cache: "no-store",
            });
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        }, "loadSongsData") ?? []
    );
}

/**
 * Finds matching song or artist
 * @param {Array} songs - Array of songs
 * @param {string} normalizedQuery - Normalized search query
 * @returns {Object|null} Match result with type and target
 */
function findMatch(songs, normalizedQuery) {
    if (!Array.isArray(songs) || songs.length === 0) {
        return null;
    }

    // Try exact song title match first
    const exactSongMatch = songs.find(
        (song) => normalizeSearchText(song.title) === normalizedQuery
    );

    if (exactSongMatch) {
        return { type: "song", target: exactSongMatch.artist };
    }

    // Try partial song title match
    const partialSongMatch = songs.find((song) =>
        normalizeSearchText(song.title).includes(normalizedQuery)
    );

    if (partialSongMatch) {
        return { type: "song", target: partialSongMatch.artist };
    }

    // Try exact artist match
    const exactArtistMatch = songs.find(
        (song) => normalizeSearchText(song.artist) === normalizedQuery
    );

    if (exactArtistMatch) {
        return { type: "artist", target: exactArtistMatch.artist };
    }

    // Try partial artist match
    const partialArtistMatch = songs.find((song) =>
        normalizeSearchText(song.artist).includes(normalizedQuery)
    );

    if (partialArtistMatch) {
        return { type: "artist", target: partialArtistMatch.artist };
    }

    return null;
}

/**
 * Determines search target (original query or artist if song/artist found)
 * @param {string} query - Original search query
 * @returns {Promise<string>} Search target
 */
async function determineSearchTarget(query) {
    const normalizedQuery = normalizeSearchText(query);

    if (normalizedQuery.length === 0) {
        return query;
    }

    const songs = await loadSongsData();
    const match = findMatch(songs, normalizedQuery);

    // If song or artist found, search by artist
    if (match?.target) {
        return match.target;
    }

    // Otherwise, use original query
    return query;
}

/**
 * Navigates to search results page
 * @param {Function} go - Navigation function
 * @param {string} query - Search query
 */
function navigateToSearch(go, query) {
    const searchUrl = `${SEARCH_PAGE_PATH}?q=${encodeURIComponent(query)}`;
    go(searchUrl);
}

/**
 * Handles search input Enter key press
 * @param {KeyboardEvent} event - Keyboard event
 * @param {HTMLElement} input - Search input element
 * @param {Function} go - Navigation function
 */
async function handleSearchSubmit(event, input, go) {
    if (event.key !== "Enter") return;

    const query = input.value || "";
    if (query.trim().length === 0) return;

    const searchTarget = await determineSearchTarget(query);
    navigateToSearch(go, searchTarget);
}

// ===== MAIN SETUP =====
/**
 * Sets up header search functionality
 * @param {Object} options - Setup options
 * @param {Function} options.go - Navigation function
 */
export function setupHeaderSearch({ go }) {
    const searchInput = document.querySelector('.search input[type="search"]');
    if (!searchInput) return;

    configureSearchInput(searchInput);

    searchInput.addEventListener("keydown", async (event) => {
        await handleSearchSubmit(event, searchInput, go);
    });
}
