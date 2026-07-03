const serviceItems = document.querySelectorAll('.our-expertise-item');

serviceItems.forEach(item => {
    const hoverImage = document.createElement('div');
    hoverImage.className = 'hover-image';
    hoverImage.innerHTML = '<img src="" alt="Hover Preview">';
    item.appendChild(hoverImage);

    const hoverImgEl = hoverImage.querySelector('img');
    let target = { x: 0, y: 0 };
    let current = { x: 0, y: 0 };
    let lastPos = { x: 0, y: 0 };
    let tracking = false;
    let mouseSpeed = 0;

    function animateImageFollow() {
        if (!tracking) return;
        current.x += (target.x - current.x) * 0.1;
        current.y += (target.y - current.y) * 0.1;

        const deltaX = target.x - lastPos.x;
        const deltaY = target.y - lastPos.y;
        mouseSpeed = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        lastPos.x = target.x;
        lastPos.y = target.y;

        const skewFactorX = 1;
        const maxSkewX = 20;
        const skewX = Math.min(maxSkewX, Math.max(-maxSkewX, deltaX * skewFactorX));

        gsap.set(hoverImage, {
            x: current.x,
            y: current.y,
            skewX: skewX,
        });

        requestAnimationFrame(animateImageFollow);
    }

    item.addEventListener('mouseenter', (e) => {
        tracking = true;
        const imgSrc = item.getAttribute('data-img');
        hoverImgEl.src = imgSrc;

        const rect = item.getBoundingClientRect();
        target.x = e.clientX - rect.left;
        target.y = e.clientY - rect.top;
        current.x = target.x;
        current.y = target.y;

        gsap.set(hoverImage, {
            x: target.x,
            y: target.y,
            scale: 0,
            opacity: 1
        });

        gsap.to(hoverImage, {
            scale: 1,
            duration: 0.4,
            ease: 'power3.out'
        });

        animateImageFollow();
    });

    item.addEventListener('mousemove', (e) => {
        if (!tracking) return;
        const rect = item.getBoundingClientRect();
        target.x = e.clientX - rect.left;
        target.y = e.clientY - rect.top;
    });

    item.addEventListener('mouseleave', () => {
        tracking = false;
        gsap.to(hoverImage, {
            scale: 0,
            opacity: 0,
            duration: 0.3,
            ease: 'power3.in'
        });
    });
});

// our-expertise-7 Hover Animation
// ===============================
function Team_animation() {
    const wrapper = $(".our-expertise-inner");
    const active_bg = wrapper.find(".active-bg");

    function moveBgTo(target) {
        if (!target.length) return;

        const offsetTop = target.offset().top;
        const height = target.outerHeight();
        const wrapperTop = wrapper.offset().top;
        const translateY = offsetTop - wrapperTop;

        active_bg.css({
            transform: `translateY(${translateY}px)`,
            height: `${height}px`,
            opacity: 1
        });
    }

    // On hover
    wrapper.find(".our-expertise-item").on("mouseenter", function () {
        moveBgTo($(this));
    });

    // On leave, hide background
    wrapper.on("mouseleave", function () {
        active_bg.css({
            opacity: 0,
            height: 0
        });
    });
}

$(document).ready(function () {
    Team_animation();
});





