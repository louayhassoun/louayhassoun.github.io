class FloatingCodeSystem {
    constructor() {
        this.container = document.querySelector('.floating-code-container');
        this.lines = [
            "console.log('Hello World');",
            "let x = 10;",
            "function greet(name) { return `Hi ${name}`; }",
            "const sum = (a, b) => a + b;"
        ];
        this.init();
    }

    init() {
        this.renderLines();
        this.animateLines();
    }

    renderLines() {
        this.container.innerHTML = '';
        this.lines.forEach(line => {
            const div = document.createElement('div');
            div.classList.add('code-line');
            div.textContent = line;
            this.container.appendChild(div);
        });
    }

    animateLines() {
        const lineElements = this.container.querySelectorAll('.code-line');
        lineElements.forEach((el, idx) => {
            el.style.animationDelay = `${idx * 0.5}s`;
            el.classList.add('fade-in-up');
        });
    }
}
