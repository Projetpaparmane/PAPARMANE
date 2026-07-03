jQuery(function ($) {

    $(document).ready(function () {

        "use strict";

        ShowcaseSlider();
        ShowcaseWebglCore();
    });

    /*--------------------------------------------------
    Function Page Load (Preloader Removed)
    ---------------------------------------------------*/
    function PageLoad() {
        function initOnFirstLoad() {
            // Canvas Slider animation
            if (!$('#canvas-slider').hasClass("active")) {
                gsap.set($('#canvas-slider'), {
                    opacity: 1,
                    scale: 1.1
                });
                gsap.to($('#canvas-slider'), {
                    duration: 0.7,
                    opacity: 1,
                    scale: 1,
                    delay: 0.2,
                    ease: Power2.easeOut
                });
            }

            // Clam slider fade in
            gsap.set($("#clam-slider-holder"), { opacity: 0 });
            gsap.to($("#clam-slider-holder"), {
                duration: 0.7,
                opacity: 1,
                delay: 0.3,
                ease: Power2.easeOut
            });

            // Add 'loaded' class after delay
            setTimeout(function () {
                $('#clam-slider-holder, #showcase-carousel-holder, .showcase-list-holder').addClass("loaded");
            }, 1000);

            ScrollTrigger.refresh();
        }

        // সরাসরি initOnFirstLoad() কল করা হচ্ছে
        initOnFirstLoad();
    }

    // Call PageLoad on window load
    window.addEventListener('load', function () {
        PageLoad();
    });


    /*--------------------------------------------------
    Function Showcase Slider
    ---------------------------------------------------*/
    function ShowcaseSlider() {

        if ($('#clam-slider-holder').length > 0) {

            const clam_slider = new Swiper('#clam-slider-main', {
                direction: "horizontal",
                loop: true,
                slidesPerView: 'auto',
                effect: 'fade',
                touchStartPreventDefault: false,
                speed: 1000,
                mousewheel: true,
                simulateTouch: true,
                parallax: true,
                navigation: {
                    nextEl: '.clam-slider__arrow-next',
                    prevEl: '.clam-slider__arrow-prev',
                },
                pagination: {
                    el: '.clam-slider-pagination',
                    clickable: true,
                },
                on: {
                    slidePrevTransitionStart: function () {
                        $('.clam-slider-pagination').find('.swiper-pagination-bullet').each(function () {
                            if (!$(this).hasClass("swiper-pagination-bullet-active")) {
                                $('#trigger-slides .swiper-slide-active').find('div').first().each(function () {
                                    if (!$(this).hasClass("active")) {
                                        $(this).trigger('click');
                                    }
                                });

                                $('#trigger-slides .swiper-slide-duplicate-active').find('div').first().each(function () {
                                    if (!$(this).hasClass("active")) {
                                        $(this).trigger('click');
                                    }
                                });

                            }
                        });
                    },
                    slideNextTransitionStart: function () {
                        $('.clam-slider-pagination').find('.swiper-pagination-bullet').each(function () {
                            if (!$(this).hasClass("swiper-pagination-bullet-active")) {
                                $('#trigger-slides .swiper-slide-active').find('div').first().each(function () {
                                    if (!$(this).hasClass("active")) {
                                        $(this).trigger('click');
                                    }
                                });

                                $('#trigger-slides .swiper-slide-duplicate-active').find('div').first().each(function () {
                                    if (!$(this).hasClass("active")) {
                                        $(this).trigger('click');
                                    }
                                });


                            }
                        });
                    },

                },
            });

        }
    }

    /*--------------------------------------------------
    Function Showcase Webgl Core
    ---------------------------------------------------*/
    function ShowcaseWebglCore() {

        if ($('#clam-slider-holder').length > 0) {

            var vertex = 'varying vec2 vUv; void main() {  vUv = uv;  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );	}';
            var fragment = `
                varying vec2 vUv;
                uniform sampler2D currentImage;
                uniform sampler2D nextImage;
                uniform sampler2D disp;
                uniform float dispFactor;
                uniform float effectFactor;
                uniform vec4 resolution;

                void main() {
                    vec2 uv = (vUv - vec2(0.5))*resolution.zw + vec2(0.5);
                    vec4 disp = texture2D(disp, uv);
                    vec2 distortedPosition = vec2(uv.x + dispFactor * (disp.r*effectFactor), uv.y);
                    vec2 distortedPosition2 = vec2(uv.x - (1.0 - dispFactor) * (disp.r*effectFactor), uv.y);
                    vec4 _currentImage = texture2D(currentImage, distortedPosition);
                    vec4 _nextImage = texture2D(nextImage, distortedPosition2);
                    vec4 finalTexture = mix(_currentImage, _nextImage, dispFactor);
                    gl_FragColor = finalTexture;
                }
            `;

            var gl_canvas = new RrdvesWebGL({
                vertex: vertex,
                fragment: fragment,
            });

            if ($('#clam-slider-main').length > 0) {

                var addEvents = function () {
                    var triggerSlide = Array.from(document.getElementById('trigger-slides').querySelectorAll('.slide-wrap'));
                    gl_canvas.isRunning = false;

                    triggerSlide.forEach((el) => {
                        el.addEventListener('click', function () {
                            if (!gl_canvas.isRunning) {
                                gl_canvas.isRunning = true;

                                document.getElementById('trigger-slides').querySelectorAll('.active')[0].className = '';
                                this.className = 'active';

                                var slideId = parseInt(this.dataset.slide, 10);

                                gl_canvas.material.uniforms.nextImage.value = gl_canvas.textures[slideId];
                                gl_canvas.material.uniforms.nextImage.needsUpdate = true;

                                gsap.to(gl_canvas.material.uniforms.dispFactor, {
                                    duration: 1,
                                    value: 1,
                                    ease: 'Sine.easeInOut',
                                    onComplete: function () {
                                        gl_canvas.material.uniforms.currentImage.value = gl_canvas.textures[slideId];
                                        gl_canvas.material.uniforms.currentImage.needsUpdate = true;
                                        gl_canvas.material.uniforms.dispFactor.value = 0.0;
                                        gl_canvas.isRunning = false;
                                    }
                                });
                            }
                        });
                    });
                };

                addEvents();
            }
        }
    }

});
