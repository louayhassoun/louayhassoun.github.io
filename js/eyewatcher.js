export class EyeWatcher {
    constructor() {
        this.eyeWatcher = document.getElementById('eye-watcher');
        this.pupil = this.eyeWatcher.querySelector('.pupil');
        this.eyelid = this.eyeWatcher.querySelector('.eyelid');
        this.message = this.eyeWatcher.querySelector('.message');
        this.messages = [
            'Hello there!',
            'Check out my projects!',
            'Scroll down for services!'
        ];
        this.messageIndex = -1;
        this.isVisible = false;
        this.isBlinking = false;
        this.positions = [
            { top: '64px', right: '8px', left: 'auto', bottom: 'auto' },
            { top: 'auto', right: '8px', left: 'auto', bottom: '64px' }
        ];
        this.desktopPositions = [
            { top: '100px', right: '50px', left: 'auto', bottom: 'auto' },
            { top: 'auto', right: '50px', left: 'auto', bottom: '100px' }
        ];

        this.init();
    }

    init() {
        setTimeout(() => this.showNextMessage(), 2000);
        document.addEventListener('mousemove', (e) => this.trackMouse(e));
        setInterval(() => {
            if (!this.isBlinking && this.isVisible && Math.random() < 0.3) this.blink();
        }, 2000);
    }

    showNextMessage() {
        this.messageIndex++;
        if (this.messageIndex >= this.messages.length) return this.hideEye();

        const positions = window.innerWidth >= 640 ? this.desktopPositions : this.positions;
        const position = positions[this.messageIndex];

        Object.assign(this.eyeWatcher.style, {
            top: position.top,
            right: position.right,
            left: position.left,
            bottom: position.bottom,
            transform: 'translateX(0) scale(1)',
            opacity: '1'
        });

        this.message.textContent = this.messages[this.messageIndex];
        this.isVisible = true;

        setTimeout(() => this.hideCurrentMessage(), 4000);
    }

    hideCurrentMessage() {
        this.isVisible = false;
        this.eyeWatcher.style.transform = 'scale(0.8)';
        this.eyeWatcher.style.opacity = '0';
        setTimeout(() => this.showNextMessage(), 1000);
    }

    hideEye() {
        this.isVisible = false;
        this.eyeWatcher.style.transform = 'scale(0.8)';
        this.eyeWatcher.style.opacity = '0';
        setTimeout(() => {
            this.messageIndex = -1;
            this.showNextMessage();
        }, Math.random() * 30000 + 30000);
    }

    trackMouse(e) {
        if (this.isBlinking || !this.isVisible) return;

        const eyeRect = this.pupil.parentElement.getBoundingClientRect();
        const centerX = eyeRect.left + eyeRect.width / 2;
        const centerY = eyeRect.top + eyeRect.height / 2;

        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const distance = Math.min(8, Math.hypot(e.clientX - centerX, e.clientY - centerY) / 10);

        this.pupil.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
    }

    blink() {
        this.isBlinking = true;
        this.eyelid.style.height = '100%';
        setTimeout(() => {
            this.eyelid.style.height = '0%';
            this.isBlinking = false;
        }, 150);
    }
}

export function closeEyeWatcher() {
    const eyeWatcher = document.getElementById('eye-watcher');
    eyeWatcher.style.transform = 'translateX(100%) scale(0.8)';
    eyeWatcher.style.opacity = '0';
    setTimeout(() => eyeWatcher.style.display = 'none', 500);
}
