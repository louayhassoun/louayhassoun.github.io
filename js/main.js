import { EyeWatcher, closeEyeWatcher } from './js/eyeWatcher.js';
import { openProjectDemo, closeModal, openServiceModal, closeServiceModal } from './js/modals.js';
import { FloatingCodeSystem } from './js/floatingCodeSystem.js';
import { typeText } from './js/typeText.js';
import { revealOnScroll } from './js/revealOnScroll.js';

document.addEventListener('DOMContentLoaded', () => {
    new FloatingCodeSystem();
    new EyeWatcher();
    typeText();
    revealOnScroll();

    // Escape closes everything
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeEyeWatcher();
            closeModal();
            closeServiceModal();
        }
    });

    // Close modals by clicking outside
    document.getElementById('project-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeModal();
    });

    document.getElementById('service-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeServiceModal();
    });
});
