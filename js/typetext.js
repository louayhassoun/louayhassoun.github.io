function typeText() {
    const elements = document.querySelectorAll('.typewriter');
    elements.forEach(el => {
        const text = el.dataset.text || el.textContent;
        el.textContent = '';
        let index = 0;

        function type() {
            if (index < text.length) {
                el.textContent += text.charAt(index);
                index++;
                setTimeout(type, 50);
            }
        }
        type();
    });
}
export { typeText };