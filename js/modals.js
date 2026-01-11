export function openProjectDemo(projectType) {
    const modal = document.getElementById('project-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    const projects = {
        Dibo: {
            title: '🚚 Dibo - Delivery App Platform',
            content: '...paste your HTML content here...'
        },
        pos: { title: '🏪 Professional POS System', content: '...' },
        menu: { title: '🍽️ Digital Restaurant Menu System', content: '...' }
    };

    const project = projects[projectType];
    title.textContent = project.title;
    body.innerHTML = project.content;
    modal.classList.add('active');
}

export function closeModal() {
    document.getElementById('project-modal').classList.remove('active');
}

export function openServiceModal(serviceType) {
    const modal = document.getElementById('service-modal');
    const title = document.getElementById('service-modal-title');
    const body = document.getElementById('service-modal-body');

    const services = {
        web: { title: '🌐 Web Development Services', content: '...' },
        mobile: { title: '📱 Mobile Development Services', content: '...' }
    };

    const service = services[serviceType];
    title.textContent = service.title;
    body.innerHTML = service.content;
    modal.classList.add('active');
}

export function closeServiceModal() {
    document.getElementById('service-modal').classList.remove('active');
}
