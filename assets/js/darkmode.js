/**
 * Dark Mode Manager
 * Quản lý chế độ tối/sáng cho toàn bộ ứng dụng
 */

class DarkModeManager {
    constructor() {
        this.darkModeKey = "musicbox-dark-mode";
        this.toggleButton = null;
        this.init();
    }

    /**
     * Khởi tạo dark mode
     */
    init() {
        // Lấy preference từ localStorage
        const savedTheme = localStorage.getItem(this.darkModeKey);

        // Nếu có saved theme, apply nó
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            // Nếu không, check system preference
            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;
            this.setTheme(prefersDark ? "dark" : "light");
        }

        // Tạo toggle button
        this.createToggleButton();

        // Listen for system theme changes
        window
            .matchMedia("(prefers-color-scheme: dark)")
            .addEventListener("change", (e) => {
                if (!localStorage.getItem(this.darkModeKey)) {
                    this.setTheme(e.matches ? "dark" : "light");
                }
            });
    }

    /**
     * Tạo nút toggle dark mode trong header
     */
    createToggleButton() {
        const headerRight = document.querySelector(".header-right");
        if (!headerRight) return;

        // Kiểm tra xem nút đã tồn tại chưa
        const existingButton = headerRight.querySelector(".dark-mode-toggle");
        if (existingButton) {
            this.toggleButton = existingButton;
            this.updateToggleIcon(this.getCurrentTheme());

            // Add event listener nếu chưa có
            if (!existingButton.dataset.initialized) {
                existingButton.addEventListener("click", () => this.toggle());
                existingButton.dataset.initialized = "true";
            }
            return;
        }

        // Tạo button mới
        this.toggleButton = document.createElement("button");
        this.toggleButton.className = "dark-mode-toggle";
        this.toggleButton.title = "Chuyển đổi chế độ sáng/tối";
        this.toggleButton.setAttribute("aria-label", "Chuyển đổi dark mode");
        this.toggleButton.dataset.initialized = "true";

        // Thêm icon
        const icon = document.createElement("i");
        icon.className =
            this.getCurrentTheme() === "dark"
                ? "fa-solid fa-sun"
                : "fa-solid fa-moon";
        icon.setAttribute("aria-hidden", "true");
        this.toggleButton.appendChild(icon);

        // Add event listener
        this.toggleButton.addEventListener("click", () => this.toggle());

        // Insert before premium button
        const premiumBtn = headerRight.querySelector(".premium-btn");
        if (premiumBtn) {
            headerRight.insertBefore(this.toggleButton, premiumBtn);
        } else {
            headerRight.insertBefore(this.toggleButton, headerRight.firstChild);
        }
    }

    /**
     * Lấy theme hiện tại
     */
    getCurrentTheme() {
        return document.documentElement.getAttribute("data-theme") || "light";
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem(this.darkModeKey, theme);
        this.updateToggleIcon(theme);
    }

    /**
     * Toggle theme
     */
    toggle() {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        this.setTheme(newTheme);

        // Animate the button
        if (this.toggleButton) {
            this.toggleButton.classList.add("rotating");
            setTimeout(() => {
                this.toggleButton.classList.remove("rotating");
            }, 300);
        }
    }

    /**
     * Update icon của toggle button
     */
    updateToggleIcon(theme) {
        if (!this.toggleButton) return;

        const icon = this.toggleButton.querySelector("i");
        if (icon) {
            icon.className =
                theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
        }
    }
}

// Export cho ES6 modules
export default DarkModeManager;

// Hoặc init tự động nếu không dùng modules
if (typeof module === "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        window.darkModeManager = new DarkModeManager();
    });
}
