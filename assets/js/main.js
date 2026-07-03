/***************************************************
==================== JS INDEX ======================
****************************************************

  // Data Css js
  // sticky header
  // Register GSAP Plugins
  // Smooth active
  // Preloader
  // Side Info Js
  // meanmenu activation 
  // Counter active
  // Magnific Video popup
  // Image Reveal Animation
  // testimonial slider
  // text slider 
  // client slider 
  // GSAP Fade Animation 
  // Text Invert With Scroll 
  // Pin Active
  // grow animation 
  // go full width 
  // scale animation 
  // cta text animation 
  // hover reveal start
  // go-visible animation 
  // video Active
  // Moving text		
  // Moving Gallery		
  // moving testimonial 
  // capability hover active 
  // video start
  // text-animation start
  // service-area-2 text and bg animation start
  // work-area-2 box animation start
  // hover reveal image animation 
  // GSAP hover animations for .text-underline elements
  // Client Pin Active
  // about 3 thumb animation 
  // GSAP title animation
  // Animation Word
  // Full Character Setup 
  // approach-area
  // approach-area service details page
  // button animation
  // service-area-4
  // service-area-4 image
  // portfolio-slide
  // portfolio-slide-2
  // portfolio-slide-3
  // portfolio-slide-4
  // portfolio-slide-5
  // parallax
  // woking card
  // circle Animation
****************************************************/

(function ($) {
  "use strict";

  var windowOn = $(window);
  let mm = gsap.matchMedia();

  // Preloader
  $(document).ready(function () {
    $('#container').addClass('loaded');
    if ($('#container').hasClass('loaded')) {
      $('#preloader').delay(1000).queue(function () {
        $(this).remove();
      });
    }
  });

  $("[data-background]").each(function () {
    $(this).css(
      "background-image",
      "url( " + $(this).attr("data-background") + "  )"
    );
  });

  // sticky header
  function pinned_header() {
    var lastScrollTop = 0;

    windowOn.on('scroll', function () {
      var currentScrollTop = $(this).scrollTop();
      if (currentScrollTop > lastScrollTop) {
        $('.header-sticky').removeClass('sticky');
        $('.header-sticky').addClass('transformed');
      } else if ($(this).scrollTop() <= 500) {
        $('.header-sticky').removeClass('sticky');
        $('.header-sticky').removeClass('transformed');
      } else {
        $('.header-sticky').addClass('sticky');
        $('.header-sticky').removeClass('transformed');
      }
      lastScrollTop = currentScrollTop;
    });
  }
  pinned_header();

  // Register GSAP Plugins
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, CustomEase, ScrollToPlugin);

  // Smooth active
  var device_width = window.screen.width;

  if (device_width > 767) {
    if (document.querySelector("#has_smooth").classList.contains("has-smooth")) {
      const smoother = ScrollSmoother.create({
        smooth: 0.9,
        effects: device_width < 1025 ? false : true,
        smoothTouch: 0.1,
        normalizeScroll: {
          allowNestedScroll: true,
        },
        ignoreMobileResize: true,
      });
    }

  }

  // Side Info Js
  $(".side-info-close,.offcanvas-overlay").on("click", function () {
    $(".side-info").removeClass("info-open");
    $(".offcanvas-overlay").removeClass("overlay-open");
  });
  $(".side-toggle").on("click", function () {
    $(".side-info").addClass("info-open");
    $(".offcanvas-overlay").addClass("overlay-open");
  });

  $(window).scroll(function () {
    if ($("body").scrollTop() > 0 || $("html").scrollTop() > 0) {
      $(".side-info").removeClass("info-open");
      $(".offcanvas-overlay").removeClass("overlay-open");
    }
  });

  // meanmenu activation 
  $('.main-menu').meanmenu({
    meanScreenWidth: "1199",
    meanMenuContainer: '.mobile-menu',
    meanMenuCloseSize: '28px',
  });
  $('.main-menu-all').meanmenu({
    meanScreenWidth: "5000",
    meanMenuContainer: '.mobile-menu',
    meanMenuCloseSize: '28px',
  });

  // Counter active
  if ('counterUp' in window) {
    const skill_counter = window.counterUp.default
    const skill_cb = entries => {
      entries.forEach(entry => {
        const el = entry.target
        if (entry.isIntersecting && !el.classList.contains('is-visible')) {
          skill_counter(el, {
            duration: 1500,
            delay: 16,
          })
          el.classList.add('is-visible')
        }
      })
    }
    const IO = new IntersectionObserver(skill_cb, {
      threshold: 1
    })
    const els = document.querySelectorAll('.t-counter');
    els.forEach((el) => {
      IO.observe(el)
    });
  }

  // Magnific Video popup
  if ($('.video-popup').length && 'magnificPopup' in jQuery) {
    $('.video-popup').magnificPopup({
      type: 'iframe',
    });
  }

  // Image Reveal Animation
  let img_anim_reveal = document.querySelectorAll(".img_anim_reveal");

  img_anim_reveal.forEach((img_reveal) => {
    let image = img_reveal.querySelector("img");
    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: img_reveal,
        start: "top 50%",
      }
    });

    tl.set(img_reveal, { autoAlpha: 1 });
    tl.from(img_reveal, 1.5, {
      yPercent: -100,
      ease: Power2.out
    });
    tl.from(image, 1.5, {
      yPercent: 100,
      scale: 1.3,
      delay: -1.5,
      ease: Power2.out
    });
  });

  // testimonial slider
  if (('.testimonial-slider').length) {
    var testimonial_slider = new Swiper(".testimonial-slider", {
      loop: false,
      slidesPerView: 1,
      spaceBetween: 100,
      speed: 1800,
      watchSlidesProgress: true,
      navigation: {
        prevEl: ".testimonial-button-prev",
        nextEl: ".testimonial-button-next",
      },
      pagination: {
        el: '.testimonial-pagination',
        type: 'bullets',
        clickable: true
      },
      breakpoints: {
        576: {
          slidesPerView: 1,
        },
        768: {
          slidesPerView: 1,
        },
        992: {
          slidesPerView: 1,
        },
        1201: {
          slidesPerView: 1,
        },
        1367: {
          slidesPerView: 1,
        },
      }
    });
  }

  // text slider 
  if ('.text-slider-active') {
    var text_slider_active = new Swiper(".text-slider-active", {
      slidesPerView: 'auto',
      loop: true,
      autoplay: true,
      spaceBetween: 35,
      speed: 10000,
      allowTouchMove: false,
      autoplay: {
        delay: 1,
      },
    });
  }

  // client slider 
  if (document.querySelectorAll(".client-slider-active").length > 0) {
    if ('.client-slider-active') {
      var client_slider_active = new Swiper(".client-slider-active", {
        slidesPerView: 'auto',
        loop: true,
        autoplay: true,
        spaceBetween: 0,
        speed: 5000,
        allowTouchMove: false,
        autoplay: {
          delay: 1,
        },
      });
    }
  }

  // GSAP Fade Animation 
  let fadeArray_items = document.querySelectorAll(".fade-anim");
  if (fadeArray_items.length > 0) {
    const fadeArray = gsap.utils.toArray(".fade-anim")
    fadeArray.forEach((item, i) => {
      var fade_direction = "bottom"
      var onscroll_value = 1
      var duration_value = 1.15
      var fade_offset = 50
      var delay_value = 0.15
      var ease_value = "power2.out"
      if (item.getAttribute("data-offset")) {
        fade_offset = item.getAttribute("data-offset");
      }
      if (item.getAttribute("data-duration")) {
        duration_value = item.getAttribute("data-duration");
      }
      if (item.getAttribute("data-direction")) {
        fade_direction = item.getAttribute("data-direction");
      }
      if (item.getAttribute("data-on-scroll")) {
        onscroll_value = item.getAttribute("data-on-scroll");
      }
      if (item.getAttribute("data-delay")) {
        delay_value = item.getAttribute("data-delay");
      }
      if (item.getAttribute("data-ease")) {
        ease_value = item.getAttribute("data-ease");
      }
      let animation_settings = {
        opacity: 0,
        ease: ease_value,
        duration: duration_value,
        delay: delay_value,
      }
      if (fade_direction == "top") {
        animation_settings['y'] = -fade_offset
      }
      if (fade_direction == "left") {
        animation_settings['x'] = -fade_offset;
      }
      if (fade_direction == "bottom") {
        animation_settings['y'] = fade_offset;
      }
      if (fade_direction == "right") {
        animation_settings['x'] = fade_offset;
      }
      if (onscroll_value == 1) {
        animation_settings['scrollTrigger'] = {
          trigger: item,
          start: 'top 85%',
        }
      }
      gsap.from(item, animation_settings);
    })
  }

  // Text Invert With Scroll 
  const split = new SplitText(".text-invert", { type: "lines" });
  split.lines.forEach((target) => {
    gsap.to(target, {
      backgroundPositionX: 0,
      ease: "none",
      scrollTrigger: {
        trigger: target,
        scrub: 1,
        start: 'top 85%',
        end: "bottom center",
      }
    });
  });

  // gsap nav
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop,
          behavior: 'smooth',
        });
      }
    });
  });

  mm.add("(min-width: 1024px)", () => {
    var pin_fixed = document.querySelector('.pin-element');
    if (pin_fixed && device_width > 991) {
      gsap.to(".pin-element", {
        scrollTrigger: {
          trigger: ".pin-area",
          pin: ".pin-element",
          start: "top top",
          end: "bottom bottom",
          pinSpacing: false,
        }
      });
    }

    // grow animation 
    var grow = document.querySelectorAll(".grow");
    grow.forEach((item) => {
      gsap.to(item, {
        width: "100%",
        ease: "none",
        scrollTrigger: {
          trigger: item,
          scrub: 2,
          start: 'top 90%',
          end: "top center",
        }
      });
    });



  });

  // go full width 
  if (document.querySelectorAll(".go_full").length > 0) {
    var go_full = document.querySelectorAll(".go_full");
    go_full.forEach((item) => {
      gsap.set(item, {
        position: "relative",
        left: "50%",
        transform: "translate(-50%, 0)",
        width: "auto",
      });
      gsap.to(item, {
        width: "100vw",
        ease: "none",
        scrollTrigger: {
          trigger: item,
          scrub: 0,
          start: "top bottom",
          end: "bottom bottom",
        }
      });
    });
  }

  // scale animation 
  var scale = document.querySelectorAll(".scale");
  var image = document.querySelectorAll(".scale img");
  scale.forEach((item) => {
    gsap.to(item, {
      scale: 1,
      duration: 1,
      ease: "power1.out",
      scrollTrigger: {
        trigger: item,
        start: 'top bottom',
        end: "bottom top",
        toggleActions: 'play reverse play reverse'
      }
    });
  });
  image.forEach((image) => {
    gsap.set(image, {
      scale: 1.3,
    });
    gsap.to(image, {
      scale: 1,
      duration: 1,
      scrollTrigger: {
        trigger: image,
        start: 'top bottom',
        end: "bottom top",
        toggleActions: 'play reverse play reverse'
      }
    });
  })

  // cta text animation 
  if (document.querySelectorAll(".cta-area").length > 0) {
    var tl = gsap.timeline({
      ease: "none",
      scrollTrigger: {
        trigger: ".cta-area",
        pin: true,
        pinSpacing: true,
        scrub: 2,
        start: 'bottom 100%',
        end: "200%",
      }
    });
    tl.to(".cta-area .area-bg", { scale: "10", delay: 0.1, ease: "power2.in" });
    tl.to(".cta-area .section-title", { fontSize: "18vw", ease: "power2.in" }, "<");
  }

  // hover reveal start
  if (document.querySelectorAll(".hover-reveal").length > 0) {
    const hoverText = document.querySelectorAll(".hover-reveal");
    function moveText(e, hoverText) {
      const item = hoverText.getBoundingClientRect();
      const x = e.clientX - item.x;
      const y = e.clientY - item.y;
      if (hoverText.children[0]) {
        hoverText.children[0].style.transform = `translate(${x}px, ${y}px)`;
      }
    }
    hoverText.forEach((item, i) => {
      item.addEventListener("mousemove", (e) => {
        setInterval(moveText(e, item), 100);
      });
    });
  }
  // hover reveal end

  // circular-shape-wrapper
  if (document.querySelectorAll(".circular-shape-wrapper").length > 0) {
    var cs = gsap.timeline({
      ease: "power2.in",
      backgroundColor: "#FCF7F3",
      scrollTrigger: {
        trigger: ".circular-shape-wrapper",
        start: "bottom bottom",
        end: "bottom top",
        pin: true,
        scrub: 1,
      }
    })
    cs.to(".shape-thumb img", { scale: 100, rotation: 90, autoAlpha: 1, delay: 0.1 })
  }

  // funfact-area-2
  if (document.querySelectorAll(".funfact-area-2").length > 0) {
    gsap.to(".funfact-area-2 .thumb img", {
      scale: "1",
      scrollTrigger: {
        trigger: ".funfact-area-2 .thumb",
        start: "top top",
        end: "70% top",
        pin: true,
        scrub: 2,
      }
    })
  }

  // go-visible animation 
  if (document.querySelectorAll(".go-visible").length > 0) {
    var govisible = document.querySelectorAll(".go-visible");
    govisible.forEach((item) => {
      gsap.to(item, {
        opacity: "1",
        ease: "none",
        scrollTrigger: {
          trigger: item,
          scrub: 1,
          start: 'top 40%',
          end: "top 30%",
        }
      });
    });
  }

  // video Active
  if (document.querySelectorAll(".video-element").length > 0) {
    var video_fixed = document.querySelector('.video-element');
    if (video_fixed && device_width > 991) {
      gsap.to(".video-element", {
        width: "100vw",
        height: "100vh",
        borderRadius: "0",
        scrollTrigger: {
          trigger: ".video-area",
          start: "top top",
          end: "bottom bottom",
          pin: ".video-element",
          pinSpacing: false,
          scrub: true
        }
      });
    }
  }

  // Moving text		
  if (document.querySelectorAll(".moving-text").length > 0) {
    gsap.utils.toArray('.moving-text').forEach((section, index) => {
      const w = section.querySelector('.wrapper-text');
      const [x, xEnd] = (index % 2) ? [(section.offsetWidth - w.scrollWidth), 0] : [0, section.offsetWidth - w.scrollWidth];
      gsap.fromTo(w, { x }, {
        x: xEnd,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          scrub: 0.5,
          start: "20% bottom",
          end: "80% top",
        }
      });
    });
  }

  // Moving Gallery		
  if (document.querySelectorAll(".moving-gallery").length > 0) {
    gsap.utils.toArray('.moving-gallery').forEach((section, index) => {
      const w = section.querySelector('.wrapper-gallery');
      const [x, xEnd] = (index % 2) ? [(section.offsetWidth - w.scrollWidth), 0] : [0, section.offsetWidth - w.scrollWidth];
      gsap.fromTo(w, { x }, {
        x: xEnd,
        scrollTrigger: {
          trigger: section,
          scrub: 0.5,
        }
      });
    });
  }

  // moving testimonial 
  if (document.querySelectorAll(".moving-testimonial").length > 0) {
    mm.add("(min-width: 1200px)", () => {
      const e = document.querySelector(".moving-testimonial"),
        t = e.querySelector(".pin"),
        o = e.querySelectorAll(".t-card");
      ScrollTrigger.create({ trigger: t, start: "top top", end: "bottom center", pin: !0, pinSpacing: !1, scrub: !0, markers: false }), gsap.set(o, { yPercent: 50, y: 0.5 * window.innerHeight + 1 });
      const n = gsap.timeline({ paused: !0, scrollTrigger: { trigger: e, start: "top top", end: "bottom center", scrub: !0 } });
      n.to(o, { yPercent: -50, y: -0.5 * window.innerHeight, duration: 1, stagger: -0.12, ease: CustomEase.create("custom", "M0,0 C0,0 0.098,0.613 0.5,0.5 0.899,0.386 1,1 1,1") }, "sameStep"),
        n.to(o, { rotation: () => 20 * (Math.random() - 0.5), stagger: -0.12, duration: 0.5, ease: "power3.out" }, "sameStep"),
        n.to(o, { rotation: 0, stagger: -0.12, duration: 0.5, ease: "power3.in" }, "sameStep+=0.5");
    });
  };

  // capability hover active 
  if (document.querySelectorAll(".capability-hover-active").length > 0) {
    $('.capability-hover-active .capability-box').on("mouseover", function () {
      $(this).addClass('active').siblings().removeClass('active');
    });
  }

  // video start
  mm.add("(min-width: 1200px)", () => {
    if (document.querySelectorAll(".hero-area").length > 0) {
      // Detect dark mode via body class
      const isDarkMode = document.body.classList.contains("dark");
      const bigtextColor = isDarkMode ? "#FFFFFF" : "#111111";
      var ab2 = gsap.timeline({
        duration: 5,
        scrollTrigger: {
          trigger: ".hero-area",
          scrub: 2,
          start: "top 100%",
          end: "bottom 0%",
        },
      });
      ab2.to(".big-text-wrapper .big-text", {
        scale: 0.1,
        color: bigtextColor,
        duration: 2,
        y: "76%",
        transformOrigin: "bottom center",
      });
      ab2.to(".about-area", {
        scrollTrigger: {
          trigger: ".about-area",
          start: "top 0",
          end: "bottom bottom",
          pin: ".about-area",
          pinSpacing: false,
          scrub: 1,
        },
      });
      ab2.to(".big-text-wrapper", {
        scrollTrigger: {
          trigger: ".about-area",
          start: "top top",
          end: "bottom bottom",
          pin: ".big-text-wrapper",
          pinSpacing: false,
          scrub: 1,
        },
      });
      gsap.to([".about-area .text-wrapper", ".about-area .btn-wrapper"], {
        y: "40",
        delay: 2,
        opacity: 1,
        scrollTrigger: {
          trigger: ".about-area",
          start: "top center",
          end: "center center",
          scrub: 1,
        },
      });
    }
  });
  // video end

  // text-animation start
  mm.add("(min-width: 1400px)", () => {

    if (document.querySelectorAll(".about-area-2").length > 0) {
      var ab2 = gsap.timeline({
        scrollTrigger: {
          trigger: ".about-area-2 .section-content",
          pin: ".about-area-2",
          pinSpacing: false,
          start: "top top",
          end: "bottom",
          scrub: 0.2,
        },
      });
      ab2.to(".year-since", {
        right: "0",
        ease: "power1.inOut",
        delay: 0.15,
        duration: 0.75,
      });
      ab2.to([".about-area-2 .text-wrapper", ".about-area-2 .btn-wrapper"], {
        x: "100",
        opacity: 0,
        duration: 0.25,
      }, "-=0.40");
      ab2.to(".is-fading", {
        opacity: 0,
        duration: 0.15,
      });
      ab2.to(".year-since .last-text", {
        fontSize: 30,
        lineHeight: "27px",
        letterSpacing: "-0.1em",
        position: "absolute",
        top: 0,
        right: 0,
        ease: "none",
        duration: 0.40,
      });
    }
  });
  // text-animation end

  // service-area-2 text and bg animation start
  if (document.querySelectorAll(".actually-area").length > 0) {
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".actually-area",
        pin: true,
        scrub: 1,
        start: "top top",
        end: "bottom+=1500 top",
      }
    });
    const t_line = new SplitText(".t_line", { type: "lines" });
    t_line.lines.forEach((target) => {
      tl.to(target, {
        backgroundPositionX: 0,
        ease: "none",
        scrollTrigger: {
          trigger: target,
          scrub: 1,
          start: 'top 25%',
          end: "center 25%",
        }
      });
    });
    tl.to(".actually-area .section-title", {
      scale: 40,
      opacity: 0,
      ease: "power4.inOut",
      delay: 0.35,
      duration: 0.75,
    });
    tl.to(".actually-area", {
      backgroundColor: "#111111",
      duration: 0.45,
    }, "-=0.50");
  }
  // service-area-2 text and bg animation end

  // works-wrapper-2 box animation start
  if (document.querySelectorAll(".works-wrapper-2").length > 0) {
    const workBoxes = document.querySelectorAll(".works-wrapper-2 .work-box");
    gsap.fromTo(
      workBoxes,
      {
        opacity: 0,
        scale: 0.8,
        y: 50,
      },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.8,
        stagger: {
          each: 0.2,
          from: "random",
        },
        scrollTrigger: {
          trigger: ".works-wrapper-2",
          start: "top bottom",
          end: "bottom top",
          scrub: false,
        },
      }
    );
  }
  // works-wrapper-2 box animation end

  // hover reveal image animation 
  if (document.querySelectorAll(".hover-image-wrpper").length > 0) {
    const categoriesWrapper = document.querySelector('.hover-image-wrpper');
    const imageHover = document.querySelector('.image-hover');
    categoriesWrapper.addEventListener('mousemove', (e) => {
      const { clientX: mouseX, clientY: mouseY } = e;
      gsap.to(imageHover, {
        x: mouseX,
        y: mouseY,
        xPercent: -50,
        yPercent: -50,
        ease: 'power3.out',
        duration: 0.2,
      });
    });

    // GSAP hover animations for .text-underline elements
    gsap.utils.toArray('.text-underline').forEach((category) => {
      const label = category.dataset.label;

      category.addEventListener('mouseenter', () => {
        const targetImage = document.querySelector(`.image-hover[data-image="${label}"]`);

        gsap.to(targetImage, {
          opacity: 1,
          scale: 1,
          duration: 0.3,
          ease: 'power3.out',
        });
        gsap.set(targetImage, { zIndex: 1 });
      });

      category.addEventListener('mouseleave', () => {
        const targetImage = document.querySelector(`.image-hover[data-image="${label}"]`);

        gsap.to(targetImage, {
          opacity: 0,
          scale: 0.8,
          duration: 0.3,
          ease: 'power3.out',
        });
        gsap.set(targetImage, { zIndex: -1 });
      });
    });
  }
  // image animation in hero end

  // Client Pin Active
  if (document.querySelectorAll(".client-pin-element").length > 0) {
    var pin_fixed = document.querySelector('.client-pin-element');
    if (pin_fixed && device_width > 0) {

      gsap.to(".client-pin-element", {
        scrollTrigger: {
          trigger: ".client-pin-element",
          pin: ".client-pin-element",
          start: "bottom bottom",
          endTrigger: ".client-pin-area",
          end: "bottom bottom",
          pinSpacing: false,
        }
      });
    }
  }

  // about 3 thumb animation 
  if (document.querySelectorAll(".about_3__thumb-anim").length > 0) {
    let about_3_thumb_anim = document.querySelector(".about_3__thumb-anim")
    if (about_3_thumb_anim) {
      let about_3_thumb_1 = document.querySelector(".thumb-1")
      let about_3_thumb_2 = document.querySelector(".thumb-2")
      let about_3_thumb_3 = document.querySelector(".thumb-3")
      let about_3_thumb_4 = document.querySelector(".thumb-4")

      gsap.to(about_3_thumb_1, {
        xPercent: -26,
        yPercent: 0,
        scrollTrigger: {
          trigger: about_3_thumb_anim,
          start: "top bottom",
          end: "bottom center",
          pinSpacing: false,
          scrub: true
        }
      })

      gsap.to(about_3_thumb_2, {
        xPercent: 0,
        yPercent: 10,
        scrollTrigger: {
          trigger: about_3_thumb_anim,
          start: "top bottom",
          end: "bottom center",
          pinSpacing: false,
          scrub: true
        }
      })

      gsap.to(about_3_thumb_3, {
        xPercent: 30,
        yPercent: 0,
        scrollTrigger: {
          trigger: about_3_thumb_anim,
          start: "top bottom",
          end: "bottom center",
          pinSpacing: false,
          scrub: true
        }
      })
      gsap.to(about_3_thumb_4, {
        xPercent: -172,
        yPercent: 34,
        scrollTrigger: {
          trigger: about_3_thumb_anim,
          start: "top bottom",
          end: "bottom center",
          pinSpacing: false,
          scrub: true
        }
      })
    }
  }

  // GSAP title animation
  if (document.querySelectorAll(".rr_title_anim").length > 0) {
    if ($('.rr_title_anim').length > 0) {
      let splitTitleLines = gsap.utils.toArray(".rr_title_anim");
      splitTitleLines.forEach(splitTextLine => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: splitTextLine,
            start: 'top 90%',
            end: 'bottom 60%',
            scrub: false,
            markers: false,
            toggleActions: 'play none none reverse'
          }
        });

        const itemSplitted = new SplitText(splitTextLine, { type: "words, lines" });
        gsap.set(splitTextLine, { perspective: 400 });
        itemSplitted.split({ type: "lines" })
        tl.from(itemSplitted.lines, {
          duration: 1,
          delay: 0.3,
          opacity: 0,
          rotationX: -80,
          force3D: true,
          transformOrigin: "top center -50",
          stagger: 0.1
        });
      });
    }
  }

  // Animation Word
  if (document.querySelectorAll(".word-anim").length > 0) {
    let animation_word_anim_items = document.querySelectorAll(".word-anim");

    animation_word_anim_items.forEach((word_anim_item) => {

      var stagger_value = 0.04
      var translateX_value = false
      var translateY_value = false
      var onscroll_value = 1
      var data_delay = 0.1
      var data_duration = 0.75

      if (word_anim_item.getAttribute("data-stagger")) {
        stagger_value = word_anim_item.getAttribute("data-stagger");
      }
      if (word_anim_item.getAttribute("data-translateX")) {
        translateX_value = word_anim_item.getAttribute("data-translateX");
      }

      if (word_anim_item.getAttribute("data-translateY")) {
        translateY_value = word_anim_item.getAttribute("data-translateY");
      }

      if (word_anim_item.getAttribute("data-on-scroll")) {
        onscroll_value = word_anim_item.getAttribute("data-on-scroll");
      }
      if (word_anim_item.getAttribute("data-delay")) {
        data_delay = word_anim_item.getAttribute("data-delay");
      }
      if (word_anim_item.getAttribute("data-duration")) {
        data_duration = word_anim_item.getAttribute("data-duration");
      }

      if (onscroll_value == 1) {
        if (translateX_value && !translateY_value) {
          let split_word = new SplitText(word_anim_item, {
            type: "chars, words"
          })
          gsap.from(split_word.words, {
            duration: data_duration,
            x: translateX_value,
            autoAlpha: 0,
            stagger: stagger_value,
            delay: data_delay,
            scrollTrigger: {
              trigger: word_anim_item,
              start: 'top 90%'
            }
          });
        }

        if (translateY_value && !translateX_value) {
          let split_word = new SplitText(word_anim_item, {
            type: "chars, words"
          })
          gsap.from(split_word.words, {
            duration: 1,
            delay: data_delay,
            y: translateY_value,
            autoAlpha: 0,
            stagger: stagger_value,
            scrollTrigger: {
              trigger: word_anim_item,
              start: 'top 90%'
            }
          });
        }

        if (translateY_value && translateX_value) {
          let split_word = new SplitText(word_anim_item, {
            type: "chars, words"
          })
          gsap.from(split_word.words, {
            duration: 1,
            delay: data_delay,
            x: translateX_value,
            y: translateY_value,
            autoAlpha: 0,
            stagger: stagger_value,
            scrollTrigger: {
              trigger: word_anim_item,
              start: 'top 90%'
            }
          });
        }

        if (!translateX_value && !translateY_value) {
          let split_word = new SplitText(word_anim_item, {
            type: "chars, words"
          })
          gsap.from(split_word.words, {
            duration: 1,
            delay: data_delay,
            x: 20,
            autoAlpha: 0,
            stagger: stagger_value,
            scrollTrigger: {
              trigger: word_anim_item,
              start: 'top 85%',
            }
          });
        }
      } else {
        if (translateX_value > 0 && !translateY_value) {
          let split_word = new SplitText(word_anim_item, {
            type: "chars, words"
          })
          gsap.from(split_word.words, {
            duration: 1,
            delay: data_delay,
            x: translateX_value,
            autoAlpha: 0,
            stagger: stagger_value
          });
        }

        if (translateY_value > 0 && !translateX_value) {
          let split_word = new SplitText(word_anim_item, {
            type: "chars, words"
          })
          gsap.from(split_word.words, {
            duration: 1,
            delay: data_delay,
            y: translateY_value,
            autoAlpha: 0,
            stagger: stagger_value
          });
        }

        if (translateY_value > 0 && translateX_value > 0) {
          let split_word = new SplitText(word_anim_item, {
            type: "chars, words"
          })
          gsap.from(split_word.words, {
            duration: 1,
            delay: data_delay,
            x: translateX_value,
            y: translateY_value,
            autoAlpha: 0,
            stagger: stagger_value
          });
        }

        if (!translateX_value && !translateY_value) {
          let split_word = new SplitText(word_anim_item, {
            type: "chars, words"
          })
          gsap.from(split_word.words, {
            duration: 1,
            delay: data_delay,
            x: 20,
            autoAlpha: 0,
            stagger: stagger_value
          });
        }

      }

    });
  }

  // Full Character Setup 
  if (document.querySelectorAll(".char-anim").length > 0) {
    var animation_char_come_items = document.querySelectorAll(".char-anim")
    animation_char_come_items.forEach((item) => {

      var stagger_value = 0.05
      var translateX_value = 20
      var translateY_value = false
      var onscroll_value = 1
      var data_delay = 0.1
      var data_duration = 1
      var ease_value = "power2.out"

      if (item.getAttribute("data-stagger")) {
        stagger_value = item.getAttribute("data-stagger");
      }
      if (item.getAttribute("data-translateX")) {
        translateX_value = item.getAttribute("data-translateX");
      }
      if (item.getAttribute("data-translateY")) {
        translateY_value = item.getAttribute("data-translateY");
      }
      if (item.getAttribute("data-on-scroll")) {
        onscroll_value = item.getAttribute("data-on-scroll");
      }
      if (item.getAttribute("data-delay")) {
        data_delay = item.getAttribute("data-delay");
      }
      if (item.getAttribute("data-ease")) {
        ease_value = item.getAttribute("data-ease");
      }
      if (item.getAttribute("data-duration")) {
        data_duration = item.getAttribute("data-duration");
      }

      if (onscroll_value == 1) {
        if (translateX_value > 0 && !translateY_value) {
          let split_char = new SplitText(item, {
            type: "chars, words"
          });
          gsap.from(split_char.chars, {
            duration: data_duration,
            delay: data_delay,
            x: translateX_value,
            autoAlpha: 0,
            stagger: stagger_value,
            ease: ease_value,
            scrollTrigger: {
              trigger: item,
              start: 'top 85%',
            }
          });
        }
        if (translateY_value > 0 && !translateX_value) {
          let split_char = new SplitText(item, {
            type: "chars, words"
          });
          gsap.from(split_char.chars, {
            duration: data_duration,
            delay: data_delay,
            y: translateY_value,
            autoAlpha: 0,
            ease: ease_value,
            stagger: stagger_value,
            scrollTrigger: {
              trigger: item,
              start: 'top 85%',
            }
          });
        }
        if (translateX_value && translateY_value) {
          let split_char = new SplitText(item, {
            type: "chars, words"
          });
          gsap.from(split_char.chars, {
            duration: 2,
            delay: data_delay,
            y: translateY_value,
            x: translateX_value,
            autoAlpha: 0,
            ease: ease_value,
            stagger: stagger_value,
            scrollTrigger: {
              trigger: item,
              start: 'top 85%',
            }
          });
        }
        if (!translateX_value && !translateY_value) {
          let split_char = new SplitText(item, {
            type: "chars, words"
          });
          gsap.from(split_char.chars, {
            duration: 1,
            delay: data_delay,
            x: 50,
            autoAlpha: 0,
            stagger: stagger_value,
            ease: ease_value,
            scrollTrigger: {
              trigger: item,
              start: 'top 85%',
            }
          });
        }
      } else {
        if (translateX_value > 0 && !translateY_value) {
          let split_char = new SplitText(item, {
            type: "chars, words"
          });
          gsap.from(split_char.chars, {
            duration: 1,
            delay: data_delay,
            x: translateX_value,
            ease: ease_value,
            autoAlpha: 0,
            stagger: stagger_value
          });
        }
        if (translateY_value > 0 && !translateX_value) {
          let split_char = new SplitText(item, {
            type: "chars, words"
          });
          gsap.from(split_char.chars, {
            duration: 1,
            delay: data_delay,
            y: translateY_value,
            autoAlpha: 0,
            ease: ease_value,
            stagger: stagger_value
          });
        }
        if (translateX_value && translateY_value) {
          let split_char = new SplitText(item, {
            type: "chars, words"
          });
          gsap.from(split_char.chars, {
            duration: 1,
            delay: data_delay,
            y: translateY_value,
            x: translateX_value,
            ease: ease_value,
            autoAlpha: 0,
            stagger: stagger_value
          });
        }
        if (!translateX_value && !translateY_value) {
          let split_char = new SplitText(item, {
            type: "chars, words"
          });
          gsap.from(split_char.chars, {
            duration: 1,
            delay: data_delay,
            ease: ease_value,
            x: 50,
            autoAlpha: 0,
            stagger: stagger_value
          });
        }
      }

    });


    let revealContainers = document.querySelectorAll(".return");

    revealContainers.forEach((container) => {
      let image = container.querySelector("img");
      let tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          toggleActions: "restart none none reset"
        }
      });

      tl.set(container, { autoAlpha: 1 });
      tl.from(container, 1.5, {
        xPercent: -100,
        ease: Power2.out
      });
      tl.from(image, 1.5, {
        xPercent: 100,
        scale: 1.3,
        delay: -1.5,
        ease: Power2.out
      });
    });

  }

  // approach-area
  if (document.querySelectorAll(".approach-area").length > 0) {

    const boxes = document.querySelectorAll(".approach-area .approach-box");

    gsap.from(boxes, {
      x: "100%",
      duration: 1,
      stagger: 0.3,
      ease: "power2.out",
      scrollTrigger: {
        scrub: 2,
        trigger: ".approach-wrapper-box",
        start: "top 100%",
        end: "bottom 40%",
        toggleActions: "play none none reverse",
      }
    });
  }

  // approach-area service details page
  if (document.querySelectorAll(".approach-area-service-details-page").length > 0) {
    const boxes = document.querySelectorAll(".approach-box");
    gsap.from(boxes, {
      x: "100%",
      duration: 1,
      stagger: 0.3,
      ease: "power2.out",
      scrollTrigger: {
        scrub: 2,
        trigger: ".approach-wrapper-box",
        start: "top 100%",
        end: "bottom 40%",
        toggleActions: "play none none reverse",
      }
    });
  }

  // button animation
  $('.rr-btn-circle').on('mouseenter', function (e) {
    var x = e.pageX - $(this).offset().left;
    var y = e.pageY - $(this).offset().top;

    $(this).find('.rr-btn-circle-dot').css({
      top: y,
      left: x
    });
  });

  $('.rr-btn-circle').on('mouseout', function (e) {
    var x = e.pageX - $(this).offset().left;
    var y = e.pageY - $(this).offset().top;

    $(this).find('.rr-btn-circle-dot').css({
      top: y,
      left: x
    });
  });
  1

  var hoverBtns = gsap.utils.toArray(".rr-hover-btn-wrapper");

  const hoverBtnItem = gsap.utils.toArray(".rr-btn-circle");
  hoverBtns.forEach((btn, span) => {
    $(btn).mousemove(function (e) {
      callParallax(e);
    });

    function callParallax(e) {
      parallaxIt(e, hoverBtnItem[span], 100);
    }

    function parallaxIt(e, target, movement) {
      var $this = $(btn);
      var relX = e.pageX - $this.offset().left;
      var relY = e.pageY - $this.offset().top;

      gsap.to(target, 0.5, {
        x: ((relX - $this.width() / 2) / $this.width()) * movement,
        y: ((relY - $this.height() / 2) / $this.height()) * movement,
        ease: Power2.easeOut,
      });
    }
    $(btn).mouseleave(function (e) {
      gsap.to(hoverBtnItem[span], 0.5, {
        x: 0,
        y: 0,
        ease: Power2.easeOut,
      });
    });
  });

  // service-area-4
  if (document.querySelectorAll(".service-area-4").length > 0) {
    mm.add("(min-width: 1024px)", () => {
      if (document.querySelectorAll(".service-area-4").length > 0) {
        const races = document.querySelector(".service-area-4");
        const racesScrollWidth = races.scrollWidth;

        const getScrollAmount = () =>
          -(racesScrollWidth - document.querySelector(".service-area-4").offsetWidth);

        const wrapperTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: ".service-area-4",
            start: "top top",
            end: `+=${Math.abs(getScrollAmount())}`,
            scrub: 3,
            pin: true,
          },
        });

        wrapperTimeline.to(".services-wrapper-4", {
          x: getScrollAmount(),
          delay: 0.05,
          ease: "power1.inOut",
        });

        wrapperTimeline.to(
          ".service-thumb-line-wrapper span",
          {
            scaleX: 0,
            stagger: 0.04,
            ease: "power1.out",
          },
          "<"
        );
      }
    });
  }

  // section-content__thumb image
  if (document.querySelectorAll(".section-content__thumb").length > 0) {
    gsap.fromTo(
      ".section-content__thumb img",
      {
        x: 350,
      },
      {
        x: 0,
        opacity: 1,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".section-content__thumb img",
          start: "top 80%",
          toggleActions: "play none none none",
          scrub: 2,
        },
      }
    );
  }

  // portfolio-slide
  if (document.querySelectorAll(".portfolio").length > 0) {
    var interleaveOffset = 1;
    var swiperOptions = {
      loop: true,
      speed: 1800,
      parallax: true,
      mousewheel: {
        releaseOnEdges: true,
      },

      pagination: {
        el: '.portfolio-pagination',
        clickable: true,
      },

      navigation: {
        prevEl: ".portfolio__slider__arrow-prev",
        nextEl: ".portfolio__slider__arrow-next",
      },

      on: {
        progress: function () {
          var swiper = this;
          for (var i = 0; i < swiper.slides.length; i++) {
            var slideProgress = swiper.slides[i].progress;
            var innerOffset = swiper.width * interleaveOffset;
            var innerTranslate = slideProgress * innerOffset;
            swiper.slides[i].querySelector(".slide-inner").style.transform =
              "translate3d(" + innerTranslate + "px, 0, 0)";
          }
        },

        touchStart: function () {
          var swiper = this;
          for (var i = 0; i < swiper.slides.length; i++) {
            swiper.slides[i].style.transition = "";
          }
        },

        setTransition: function (speed) {
          var swiper = this;
          for (var i = 0; i < swiper.slides.length; i++) {
            swiper.slides[i].style.transition = speed + "ms";
            swiper.slides[i].querySelector(".slide-inner").style.transition =
              speed + "ms";
          }
        },

        slideChange: function () {
          var bullets = document.querySelectorAll(".swiper-pagination-bullet");
          bullets.forEach((bullet, index) => {
            if (index <= this.realIndex) {
              bullet.classList.add("swiper-pagination-bullet-active");
            }
          });
        }
      }
    };

    var swiper = new Swiper(".portfolio-activ", swiperOptions);
  }

  // portfolio-slide-2
  let portfolio2_activ = new Swiper(".portfolio-2-activ", {
    slidesPerView: 1,
    spaceBetween: 0,
    loop: true,
    speed: 2000,
    centeredSlides: true,
    clickable: true,
    effect: 'fade',
    mousewheel: {
      releaseOnEdges: true,
    },
    on: {
      slideChangeTransitionStart: function () {
        document.querySelectorAll(".line").forEach(line => {
          line.style.transform = "scaleY(1)";
        });

        setTimeout(() => {
          document.querySelectorAll(".swiper-slide-active .line").forEach(line => {
            line.style.transform = "scaleY(0)";
          });
        }, 10);
      },

      slideChange: function () {
        var bullets = document.querySelectorAll(".swiper-pagination-bullet");
        bullets.forEach((bullet, index) => {
          if (index <= this.realIndex) {
            bullet.classList.add("swiper-pagination-bullet-active");
          }
        });
      }
    },

    navigation: {
      prevEl: ".portfolio-2__slider__arrow-prev",
      nextEl: ".portfolio-2__slider__arrow-next",
    },
    pagination: {
      el: ".portfolio-2-pagination",
      clickable: true,
    },
  });

  // portfolio-slide-3
  if (document.querySelectorAll(".portfolio-3").length > 0) {
    document.querySelectorAll('.grid-mask').forEach(gridMask => {
      let blocks = [];
      for (let i = 0; i < 32; i++) {
        let block = document.createElement("div");
        block.style.transitionDelay = `${Math.random() * 1.5}s`;
        blocks.push(block);
      }
      blocks.sort(() => Math.random() - 0.5);
      blocks.forEach(block => gridMask.appendChild(block));
    });

    var swiper = new Swiper(".portfolio-3-activ", {
      slidesPerView: 1,
      spaceBetween: 0,
      loop: true,
      centeredSlides: true,
      clickable: true,
      effect: 'fade',
      mousewheel: {
        releaseOnEdges: true,
      },

      navigation: {
        prevEl: ".portfolio-3__slider__arrow-prev",
        nextEl: ".portfolio-3__slider__arrow-next",
      },
      pagination: {
        el: ".portfolio-3-pagination",
        clickable: true,
      },

      on: {
        slideChange: function () {
          var bullets = document.querySelectorAll(".swiper-pagination-bullet");
          bullets.forEach((bullet, index) => {
            if (index <= this.realIndex) {
              bullet.classList.add("swiper-pagination-bullet-active");
            }
          });
        }
      }
    });
  }

  // portfolio-slide-4
  if (document.querySelectorAll(".portfolio-4").length > 0) {
    const interleaveOffset = 0.75;
    var portfolio_4_activ = new Swiper('.portfolio-4-activ', {
      loop: true,
      direction: "vertical",
      autoplay: false,
      speed: 2000,
      watchSlidesProgress: true,
      mousewheelControl: true,
      mousewheel: true,
      navigation: {
        prevEl: ".portfolio-4__slider__arrow-prev",
        nextEl: ".portfolio-4__slider__arrow-next",
      },
      pagination: {
        el: ".portfolio-4-pagination",
        clickable: true,
      },
      on: {
        progress: function () {
          let swiper = this;

          for (let i = 0; i < swiper.slides.length; i++) {
            let slideProgress = swiper.slides[i].progress;
            let innerOffset = swiper.height * interleaveOffset;
            let innerTranslate = slideProgress * innerOffset;

            TweenMax.set(swiper.slides[i].querySelector(".slide-inner"), {
              y: innerTranslate,
            });
          }
        },
        setTransition: function (slider, speed) {
          let swiper = this;
          for (let i = 0; i < swiper.slides.length; i++) {
            swiper.slides[i].style.transition = speed + "ms";
            swiper.slides[i].querySelector(".slide-inner").style.transition =
              speed + "ms";
          }
        }
      }
    });
  }

  // portfolio-slide-5
  if (document.querySelectorAll(".portfolio-5").length > 0) {
    let portfolio5_activ = new Swiper(".portfolio-5-activ", {
      modules: [EffectSlicer],
      effect: 'slicer',
      loop: true,
      clickable: true,
      slicerEffect: {
        split: 5,
      },
      direction: 'vertical',
      speed: 600,
      mousewheel: {
        releaseOnEdges: true,
      },

      navigation: {
        prevEl: ".portfolio-5__slider__arrow-prev",
        nextEl: ".portfolio-5__slider__arrow-next",
      },
      pagination: {
        el: ".portfolio-5-pagination",
        clickable: true,
      },

      on: {
        slideChange: function () {
          var bullets = document.querySelectorAll(".swiper-pagination-bullet");
          bullets.forEach((bullet, index) => {
            if (index <= this.realIndex) {
              bullet.classList.add("swiper-pagination-bullet-active");
            }
          });
        }
      }
    });
  }

  // parallax
  if (document.querySelectorAll(".parallax-slider-wrapper").length > 0) {
    const selectAll = (e) => document.querySelectorAll(e);
    gsap.registerPlugin(ScrollTrigger);
    const tracks = selectAll(".parallax-slider-wrapper");

    tracks.forEach((track) => {
      let trackWrapper = track.querySelectorAll(".parallax-slider");
      let allImgs = track.querySelectorAll(".image");

      let trackWrapperWidth = () => {
        let width = 0;
        trackWrapper.forEach((el) => (width += el.offsetWidth));
        return width;
      };

      gsap.defaults({ ease: "none" });
      const gap = window.innerWidth * 0.05;
      let scrollTween = gsap.to(trackWrapper, {
        x: () => -trackWrapperWidth() + window.innerWidth + gap,
        scrollTrigger: {
          trigger: track,
          pin: true,
          scrub: 3,
          start: "center center",
          end: () => "+=" + (track.scrollWidth - window.innerWidth),
          onRefresh: (self) => self.getTween().resetTo("totalProgress", 0),
          invalidateOnRefresh: true
        }
      });

      allImgs.forEach((img) => {
        gsap.fromTo(img, { transform: "translateX(-10vw)" }, {
          transform: "translateX(5vw)",
          scrollTrigger: {
            trigger: img.parentNode,
            containerAnimation: scrollTween,
            start: "left right",
            end: "right left",
            scrub: true,
          },
        });

      });
    });
  }

  // woking card
  if (document.querySelectorAll(".works-wrapper-5").length > 0) {
    const cards = document.querySelectorAll(".card-wrap");

    cards.forEach(card => {
      const cardElement = card.querySelector(".card");
      const cardBg = card.querySelector(".card-bg");

      const imageUrl = card.getAttribute("data-image");
      cardBg.style.backgroundImage = `url(${imageUrl})`;

      let requestId = null;

      card.addEventListener("mousemove", (e) => {
        if (requestId) cancelAnimationFrame(requestId);
        requestId = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          const rotateX = (y / rect.height) * -30;
          const rotateY = (x / rect.width) * 30;

          cardElement.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
          cardBg.style.transform = `translateX(${x * -0.1}px) translateY(${y * -0.1}px)`;
        });
      });

      card.addEventListener("mouseleave", () => {
        if (requestId) cancelAnimationFrame(requestId);
        cardElement.style.transform = "rotateY(0deg) rotateX(0deg)";
        cardBg.style.transform = "translateX(0px) translateY(0px)";
      });
    });
  }

  // contact-form-daynamic
  $(document).ready(function () {
    $('#contact__form').submit(function (event) {
      event.preventDefault();
      var form = $(this);
      $('.loading-form').show();

      setTimeout(function () {
        $.ajax({
          type: form.attr('method'),
          url: form.attr('action'),
          data: form.serialize()
        }).done(function (data) {
          $('.loading-form').hide();
          $('#response-message').html('<p class="success-message">Your message has been sent successfully.</p>');
          form[0].reset();
        }).fail(function () {
          $('.loading-form').hide();
          $('#response-message').html('<p class="error-message">Something went wrong. Please try again later.</p>');
        });
      }, 1000);
    });
  });

  // circle Animation
  const circleAnimation = document.querySelector(".circle-text .text");
  if (circleAnimation) {
    circleAnimation.innerHTML = [...circleAnimation.innerText]
      .map((char, i) => `<span style="transform:rotate(${i * 14}deg)">${char}</span>`)
      .join("");
  }

  // Home 1 brand slider //
  if (document.querySelectorAll(".h1-brand__slider").length > 0) {
    var swiper = new Swiper(".h1-brand__slider", {
      slidesPerView: 2,
      spaceBetween: 63,
      centeredSlides: true,
      freemode: true,
      centeredSlides: true,
      loop: true,
      speed: 8000,
      allowTouchMove: false,
      autoplay: {
        delay: 1,
        disableOnInteraction: true,
      },
      breakpoints: {
        1199: {
          spaceBetween: 60,
        },
        992: {
          spaceBetween: 60,
        },
        768: {
          spaceBetween: 30,
        },
        576: {
          spaceBetween: 30,
        },
        320: {
          spaceBetween: 0,
        },

      },
    });
  }

  // button hover animation
  $('.tp-hover-btn').on('mouseenter', function (e) {
    var x = e.pageX - $(this).offset().left;
    var y = e.pageY - $(this).offset().top;

    $(this).find('.tp-btn-circle-dot').css({
      top: y,
      left: x
    });
  });

  $('.tp-hover-btn').on('mouseout', function (e) {
    var x = e.pageX - $(this).offset().left;
    var y = e.pageY - $(this).offset().top;

    $(this).find('.tp-btn-circle-dot').css({
      top: y,
      left: x
    });
  });


  var hoverBtns = gsap.utils.toArray(".tp-hover-btn-wrapper");
  const hoverBtnElem = gsap.utils.toArray(".tp-hover-btn-item");
  hoverBtns.forEach((btn, i) => {
    $(btn).mousemove(function (e) {
      callParallax(e);
    });

    function callParallax(e) {
      parallaxIt(e, hoverBtnElem[i], 80);
    }

    function parallaxIt(e, target, movement) {
      var $this = $(btn);
      var relX = e.pageX - $this.offset().left;
      var relY = e.pageY - $this.offset().top;

      gsap.to(target, 0.5, {
        x: ((relX - $this.width() / 2) / $this.width()) * movement,
        y: ((relY - $this.height() / 2) / $this.height()) * movement,
        ease: Power2.easeOut,
      });
    }
    $(btn).mouseleave(function (e) {
      gsap.to(hoverBtnElem[i], 0.5, {
        x: 0,
        y: 0,
        ease: Power2.easeOut,
      });
    });
  });

  // project-h1-brand-slider //
  if (document.querySelectorAll(".project-h1-brand-slider").length > 0) {
    var swiper = new Swiper(".project-h1-brand-slider", {
      slidesPerView: "auto",
      spaceBetween: 0,
      centeredSlides: true,
      centeredSlides: true,
      loop: true,
      speed: 3000,
      allowTouchMove: false,
      autoplay: {
        delay: 1,
        disableOnInteraction: false,
      },
    });
  }

  document.querySelectorAll('.award__item').forEach(item => {
    item.addEventListener('mouseover', function () {
      let newImage = this.getAttribute('data-image');
      let imgElement = document.querySelector('.award__thumb img');

      gsap.to(imgElement, {
        opacity: 0, duration: 0.1, onComplete: function () {
          imgElement.src = newImage;
          gsap.to(imgElement, { opacity: 1, duration: 0.1 });
        }
      });
    });
  });

  // testimonial slider active 
  if (document.querySelector(".testimonial__slider")) {
    var testimonial = new Swiper(".testimonial__slider", {
      slidesPerView: 1,
      spaceBetween: 50,
      loop: true,
      centeredSlides: true,
      autoplay: true,
      centerMode: true,
      speed: 1000,
      navigation: {
        prevEl: ".testimonial__slider-arrow-prev",
        nextEl: ".testimonial__slider-arrow-next",
      },
    });
  }

  //  hover-active
  let rItems1 = document.querySelectorAll('.h1-blog__content');
  let lItems1 = document.querySelectorAll('.h1-blog__item-thumb');

  if (rItems1.length > 0 && lItems1.length > 0) {
    rItems1.forEach((rItem, index) => {
      rItem.addEventListener('mouseenter', function () {
        if (!rItem.classList.contains('active')) {
          handleHover(rItem, lItems1[index]);
        }
      });
    });

    function handleHover(rItem, lItem) {
      rItems1.forEach(item => {
        item.classList.remove('active');
      });

      lItems1.forEach(item => {
        item.classList.remove('active');
      });

      rItem.classList.add('active');
      lItem.classList.add('active');
    }
  }

  // title animation 
  if (document.querySelectorAll(".rr-title-anim").length > 0) {
    document.addEventListener("DOMContentLoaded", () => {
      let titles = document.querySelectorAll(".rr-title-anim");

      titles.forEach(title => {
        let split = new SplitText(title, { type: "chars, words" });

        let tl = gsap.timeline({
          scrollTrigger: {
            trigger: title,
            start: "top bottom",
            toggleActions: "play none none reverse",
            onEnter: () => tl.timeScale(2.3),
            onLeaveBack: () => tl.timeScale(2.3).reverse()
          }
        });

        tl.from(split.chars, {
          opacity: 0,
          y: 50,
          rotation: 1,
          duration: 2,
          ease: "back",
          stagger: 0.05
        });
      });
    });
  }

  // video - 3 Animation 
  if (document.querySelectorAll(".pinned-3").length > 0) {
    mm.add("(min-width: 1700px)", () => {

      const tl = gsap.timeline({
        ease: "none",
        scrollTrigger: {
          trigger: ".pinned-3",
          pin: true,
          pinSpacing: false,
          scrub: 1,
          start: "top top",
          endTrigger: ".banner-section-3__video__wrapper",
          end: "bottom bottom",
          markers: false
        }
      });

      tl.to(".pinned-3 #myVideo", {
        scale: 1,
        width: "100vw",
        height: "100vh",
        right: "auto",
        xPercent: "-72",
        transformOrigin: "center center",
        ease: "power2.out"
      });
    });
  }

  // service 3 active 
  let rItems = document.querySelectorAll('.service-3__item');
  let lItems = document.querySelectorAll('.service-3__img');

  if (rItems.length > 0 && lItems.length > 0) {
    rItems.forEach((rItem, index) => {
      rItem.addEventListener('mouseenter', function () {
        if (!rItem.classList.contains('active')) {
          handleHover(rItem, lItems[index]);
        }
      });
    });

    function handleHover(rItem, lItem) {
      rItems.forEach(item => {
        item.classList.remove('active');
      });

      lItems.forEach(item => {
        item.classList.remove('active');
      });

      rItem.classList.add('active');
      lItem.classList.add('active');
    }
  }

  // cta bg animation 
  if (document.querySelectorAll(".project-bg-area").length > 0) {
    var tl = gsap.timeline({
      ease: "none",
      scrollTrigger: {
        trigger: ".project-bg-area",
        pin: true,
        pinSpacing: true,
        scrub: 3,
        start: 'bottom 100%',
        end: "bottom 0%",
      }
    });
    tl.to(".project-bg-area .bg-circle", {
      scale: "10",
      width: '100vw',
      height: "100vh",
      delay: 0.1,
      ease: "power3.inOut",
    });
  }

  // pin area 3 animation 
  if ($('.pin-area-3').length > 0) {
    let mm = gsap.matchMedia();
    mm.add("(min-width: 768px)", () => {
      return gsap.to('.pin-element_3', {
        opacity: 1,
        scrollTrigger: {
          trigger: '.pin-area-3',
          scrub: 1,
          start: 'top 30%',
          end: "bottom 100%",
          pin: '.pin-element_3',
          pinSpacing: false,
          markers: false,
          toggleActions: 'play reverse play reverse',
        }
      });
    });
  }

  // hover reveal start
  const hoveritem = document.querySelectorAll(".rr-hover-reveal-item");

  function moveImage(e, hoveritem, index) {
    const item = hoveritem.getBoundingClientRect();
    const x = e.clientX - item.x;
    const y = e.clientY - item.y;
    if (hoveritem.children[index]) {
      hoveritem.children[index].style.transform = `translate(${x}px, ${y}px)`;
    }
  }
  hoveritem.forEach((item, i) => {
    item.addEventListener("mousemove", (e) => {
      setInterval(moveImage(e, item, 1), 50);
    });
  });
  // hover reveal end

  // testimonial-section-3 activation 
  if (document.querySelector(".testimonial-section-3__active")) {
    var testimonial3 = new Swiper(".testimonial-section-3__active", {
      slidesPerView: 2,
      spaceBetween: 0,
      loop: true,
      centeredSlides: false,
      autoplay: true,
      centerMode: true,
      speed: 1000,
      navigation: {
        prevEl: ".testimonial-section-3__slide__arrow-prev",
        nextEl: ".testimonial-section-3__slide__arrow-next",
      },
      breakpoints: {
        1400: {
          slidesPerView: 2,
        },
        1200: {
          slidesPerView: 1.5,
          centeredSlides: true,
          centerMode: false,
        },
        992: {
          slidesPerView: 2,
        },
        768: {
          slidesPerView: 1.5,
          centeredSlides: true,
          centerMode: false,
        },
        576: {
          slidesPerView: 1,
        },
        320: {
          slidesPerView: 1,
        },

      },
    });
  }

  //fade-top gsap animation
  if (document.querySelectorAll(".fade-wrapper").length > 0) {
    $(".fade-wrapper").each(function () {
      var section = $(this);
      var fadeItems = section.find(".fade-top");

      fadeItems.each(function (index, element) {
        var delay = index * 0.1;

        gsap.set(element, {
          opacity: 0,
          y: 70,
        });

        ScrollTrigger.create({
          trigger: element,
          start: "top 95%",
          end: "bottom bottom",
          scrub: false,
          toggleActions: "play none none reverse",
          onEnter: function () {
            gsap.to(element, {
              opacity: 1,
              y: 0,
              duration: 0.6,
              delay: delay
            });
          },
          onLeaveBack: function () {
            gsap.to(element, { opacity: 0, y: 70, duration: 0.5 });
          }
        });
      });
    });
  }

  // img - custom - anim 
  if (document.querySelectorAll(".img-custom-anim-img").length > 0) {
    gsap.utils.toArray(".img-custom-anim-img").forEach((img) => {
      gsap.set(img, { opacity: 0, x: -50, clipPath: "inset(0 100% 0 0)" });

      ScrollTrigger.create({
        trigger: img,
        start: "top 95%",
        end: "bottom 5%",
        toggleActions: "play none none reverse",
        markers: false,
        onEnter: () => {
          gsap.to(img, {
            opacity: 1,
            x: 0,
            clipPath: "inset(0 0 0 0)",
            duration: 0.5,
            ease: "cubic-bezier(0.645, 0.045, 0.355, 1)",
          });
        },
        onLeaveBack: () => {
          gsap.to(img, {
            opacity: 0,
            x: -50,
            clipPath: "inset(0 100% 0 0)",
            duration: 0.3,
          });
        }
      });
    });
  }

  // section scroll activation 
  document.querySelectorAll(".scroll-btn").forEach((btn, index) => {
    btn.addEventListener("click", () => {
      var sectionTarget = btn.getAttribute("data-target");
      gsap.to(window, { duration: 1, scrollTo: { y: sectionTarget, offsetY: 70 } });
    });
  });

  // Check if any elements with the class ".end" exist
  if (document.querySelector('.end')) {
    let endTl = gsap.timeline({
      repeat: -1,
      delay: 1,
      scrollTrigger: {
        trigger: '.end',
        start: 'bottom 100%-=50px'
      }
    });

    gsap.set('.end', {
      opacity: 0
    });

    gsap.to('.end', {
      opacity: 1,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.end',
        start: 'bottom 100%-=50px',
        once: true
      }
    });

    let mySplitText = new SplitText(".end", {
      type: "words,chars"
    });
    let chars = mySplitText.chars;
    let endGradient = chroma.scale(['#fff']);

    endTl.to(chars, {
      duration: 0.5,
      scaleY: 0.6,
      ease: "power3.out",
      stagger: 0.04,
      transformOrigin: 'center bottom'
    });
    endTl.to(chars, {
      yPercent: -20,
      ease: "elastic",
      stagger: 0.03,
      duration: 0.8
    }, 0.5);
    endTl.to(chars, {
      scaleY: 1,
      ease: "elastic.out(1.5, 0.2)",
      stagger: 0.03,
      duration: 1.5
    }, 0.5);
    endTl.to(chars, {
      color: (i, el, arr) => {
        return endGradient(i / arr.length).hex();
      },
      ease: "power2.out",
      stagger: 0.03,
      duration: 0.3
    }, 0.5);
    endTl.to(chars, {
      yPercent: 0,
      ease: "back",
      stagger: 0.03,
      duration: 0.8
    }, 0.7);
    endTl.to(chars, {
      color: '#fff',
      duration: 1.4,
      stagger: 0.05
    });
  }

  // update js in home page 
  $(window).on('load', function (event) {
    if (document.querySelectorAll(".odometer").length > 0) {
      $('.odometer').waypoint(function (direction) {
        if (direction === 'down') {
          let countNumber = $(this.element).attr("data-count");
          $(this.element).html(countNumber);
        }
      }, {
        offset: '80%'
      });
    }
  });

  // agency slider active 
  if (document.querySelectorAll(".agency-slider-active").length > 0) {
    const $owlCarousel = $(".agency-slider-active").owlCarousel({
      items: 1,
      dots: true,
      loop: true,
      autoplayTimeout: 9000,
      autoplay: true,
    });

    $(".owl-carousel").on("initialized.owl.carousel", () => {
      setTimeout(() => {
        $(".owl-item.active .animated-text").addClass("is-transitioned");
      }, 200);
    });

    $owlCarousel.on("changed.owl.carousel", e => {
      $(".animated-text").removeClass("is-transitioned");

      const $currentOwlItem = $(".owl-item").eq(e.item.index);
      $currentOwlItem.find(".animated-text").addClass("is-transitioned");

      const $target = $currentOwlItem.find(".hero-contents");
    });
  }

  // global carousel active 
  if (document.querySelectorAll(".global-carousel").length > 0) {
    $(".global-carousel").owlCarousel({
      margin: 80,
      loop: true,
      autoplayTimeout: 5000,
      autoplay: true,
      responsive: {
        0: {
          items: 2,
        },
        480: {
          items: 3
        },
        768: {
          items: 3
        },
        992: {
          items: 4
        },

      }
    });
  }

  // portfolio showcase carousel active 
  if (document.querySelectorAll(".portfolio-showcase-carousel-active").length > 0) {
    $(".portfolio-showcase-carousel-active").owlCarousel({
      margin: 30,
      loop: true,
      autoplayTimeout: 5000,
      autoplay: true,
      dots: true,
      responsive: {
        0: {
          items: 1,
        },
        480: {
          items: 1
        },
        768: {
          items: 2
        },
        992: {
          items: 3
        },

        1191: {
          items: 3
        },

        1400: {
          items: 5
        },
      }
    });
  }

  // testimonial carousel active 
  if (document.querySelectorAll(".testimonial-carousel-list").length > 0) {
    $(".testimonial-carousel-list").owlCarousel({
      items: 1,
      dots: false,
      loop: true,
      autoplayTimeout: 8000,
      autoplay: true,
      nav: true,
      navText: ['<i class="fas fa-long-arrow-left"></i>', '<i class="fas fa-long-arrow-right"></i>'],
    });
  }


  // web-development style start
  // Sponsor Carousel
  var swiperBlog = new Swiper(".sponsor-carousel-2", {
    slidesPerView: 6,
    spaceBetween: 24,
    slidesPerGroup: 1,
    loop: true,
    autoplay: true,
    grabcursor: true,
    speed: 600,
    breakpoints: {
      320: {
        slidesPerView: 2,
        slidesPerGroup: 1,
        spaceBetween: 25,
      },
      767: {
        slidesPerView: 4,
        slidesPerGroup: 1,
        spaceBetween: 30,
      },
      1024: {
        slidesPerView: 6,
        slidesPerGroup: 1,
      },
    },
  });

  // carouselTicker initail 
  if (document.querySelectorAll(".carouselTicker-nav").length > 0) {
    $('.carouselTicker-nav').carouselTicker({
    });
    $(".carouselTicker-start").carouselTicker({
      direction: "next",
    });
  }

  // Project Carousel
  var swiperProject = new Swiper(".project-carousel", {
    slidesPerView: 1,
    spaceBetween: 30,
    slidesPerGroup: 1,
    loop: true,
    autoplay: false,
    grabcursor: true,
    initialSlide: -1,
    speed: 600,
    navigation: {
      nextEl: ".project-section .swiper-prev",
      prevEl: ".project-section .swiper-next",
    },
    pagination: {
      el: ".swiper-pagination",
      type: "fraction",
    },
  });


  if (document.querySelectorAll("[data-text-animation]").length > 0) {

    let typeSplit = new SplitType("[data-text-animation]", {
      types: "lines,words, chars",
      className: "line",
    });
    var text_animations = document.querySelectorAll(
      "[data-text-animation]"
    );
    function createScrollTrigger(triggerElement, timeline) {
      // Play tl when scrolled into view (60% from top of screen)
      ScrollTrigger.create({
        trigger: triggerElement,
        start: "top 80%",
        onEnter: () => timeline.play(),
        toggleClass: { targets: triggerElement, className: "active" }
      });
    }
    text_animations.forEach((animation) => {
      let type = "slide-up",
        duration = 0.75,
        offset = 80,
        stagger = 0.6,
        delay = 0,
        scroll = 1,
        split = "line",
        ease = "power2.out";
      // Set attribute
      if (animation.getAttribute("data-stagger")) {
        stagger = animation.getAttribute("data-stagger");
      }
      if (animation.getAttribute("data-duration")) {
        duration = animation.getAttribute("data-duration");
      }
      if (animation.getAttribute("data-text-animation")) {
        type = animation.getAttribute("data-text-animation");
      }
      if (animation.getAttribute("data-delay")) {
        delay = animation.getAttribute("data-delay");
      }
      if (animation.getAttribute("data-ease")) {
        ease = animation.getAttribute("data-ease");
      }
      if (animation.getAttribute("data-scroll")) {
        scroll = animation.getAttribute("data-scroll");
      }
      if (animation.getAttribute("data-offset")) {
        offset = animation.getAttribute("data-offset");
      }
      if (animation.getAttribute("data-split")) {
        split = animation.getAttribute("data-split");
      }
      if (scroll == 1) {
        if (type == "slide-up") {
          let tl = gsap.timeline({ paused: true });
          tl.from(animation.querySelectorAll(`.${split}`), {
            yPercent: offset,
            duration,
            ease,
            opacity: 0,
            stagger: { amount: stagger },
          });
          createScrollTrigger(animation, tl);
        }
        if (type == "slide-down") {
          let tl = gsap.timeline({ paused: true });
          tl.from(animation.querySelectorAll(`.${split}`), {
            yPercent: -offset,
            duration,
            ease,
            opacity: 0,
            stagger: { amount: stagger },
          });
          createScrollTrigger(animation, tl);
        }
        if (type == "rotate-in") {
          let tl = gsap.timeline({ paused: true });
          tl.set(animation.querySelectorAll(`.${split}`), {
            transformPerspective: 400,
          });
          tl.from(animation.querySelectorAll(`.${split}`), {
            rotationX: -offset,
            duration,
            ease,
            force3D: true,
            opacity: 0,
            transformOrigin: "top center -50",
            stagger: { amount: stagger },
          });
          createScrollTrigger(animation, tl);
        }
        if (type == "slide-from-left") {
          let tl = gsap.timeline({ paused: true });
          tl.from(animation.querySelectorAll(`.${split}`), {
            opacity: 0,
            xPercent: -offset,
            duration,
            opacity: 0,
            ease,
            stagger: { amount: stagger },
          });
          createScrollTrigger(animation, tl);
        }
        if (type == "slide-from-right") {
          let tl = gsap.timeline({ paused: true });
          tl.from(animation.querySelectorAll(`.${split}`), {
            opacity: 0,
            xPercent: offset,
            duration,
            opacity: 0,
            ease,
            stagger: { amount: stagger },
          });
          createScrollTrigger(animation, tl);
        }
        if (type == "fade-in") {
          let tl = gsap.timeline({ paused: true });
          tl.from(animation.querySelectorAll(`.${split}`), {
            opacity: 0,
            duration,
            ease,
            opacity: 0,
            stagger: { amount: stagger },
          });
          createScrollTrigger(animation, tl);
        }
        if (type == "fade-in-right") {
          let tl = gsap.timeline({ paused: true });
          tl.from(animation.querySelectorAll(`.${split}`), {
            x: 100,
            autoAlpha: 0,
            duration,
            stagger: stagger,
          });
          createScrollTrigger(animation, tl);
        }
        if (type == "fade-in-random") {
          let tl = gsap.timeline({ paused: true });
          tl.from(animation.querySelectorAll(`.${split}`), {
            opacity: 0,
            duration,
            ease,
            opacity: 0,
            stagger: { amount: stagger, from: "random" },
          });
          createScrollTrigger(animation, tl);
        }
        if (type == "scrub") {
          let tl = gsap.timeline({
            scrollTrigger: {
              trigger: animation,
              start: "top 90%",
              end: "top center",
              scrub: true,
            },
          });
          tl.from(animation.querySelectorAll(`.${split}`), {
            opacity: 0.2,
            duration,
            ease,
            stagger: { amount: stagger },
          });
        }
        // Avoid flash of unstyled content
        gsap.set("[data-text-animation]", { opacity: 1 });
      } else {
        if (type == "slide-up") {
          let tl = gsap.timeline({ paused: true });
          tl.from(animation.querySelectorAll(`.${split}`), {
            yPercent: offset,
            duration,
            ease,
            opacity: 0,
          });
        }
        if (type == "slide-down") {
          let tl = gsap.timeline({ paused: true });
          tl.from(animation.querySelectorAll(`.${split}`), {
            yPercent: -offset,
            duration,
            ease,
            opacity: 0,
          });
        }
        if (type == "rotate-in") {
          let tl = gsap.timeline({ paused: true });
          tl.set(animation.querySelectorAll(`.${split}`), {
            transformPerspective: 400,
          });
          tl.from(animation.querySelectorAll(`.${split}`), {
            rotationX: -offset,
            duration,
            ease,
            force3D: true,
            opacity: 0,
            transformOrigin: "top center -50",
          });
        }
        if (type == "slide-from-right") {
          let tl = gsap.timeline({ paused: true });
          tl.from(animation.querySelectorAll(`.${split}`), {
            opacity: 0,
            xPercent: offset,
            duration,
            opacity: 0,
            ease,
          });
        }
        if (type == "fade-in") {
          let tl = gsap.timeline({ paused: true });
          tl.from(animation.querySelectorAll(`.${split}`), {
            opacity: 0,
            duration,
            ease,
            opacity: 0,
          });
        }
        if (type == "fade-in-random") {
          let tl = gsap.timeline({ paused: true });
          tl.from(animation.querySelectorAll(`.${split}`), {
            opacity: 0,
            duration,
            ease,
            opacity: 0,
            stagger: { amount: stagger, from: "random" },
          });
        }
        if (type == "scrub") {
          tl.from(animation.querySelectorAll(`.${split}`), {
            opacity: 0.2,
            duration,
            ease,
          });
        }
      }
    });
    function textAnimationEffect() {
      let TextAnim = gsap.timeline();
      let splitText = new SplitType(".text-animation-effect", { types: 'chars' });
      if ($('.text-animation-effect .char').length) {
        TextAnim.from(".text-animation-effect .char", { duration: 1, x: 100, autoAlpha: 0, stagger: 0.1 }, "-=1");
      }
    }
  }




  // image animation
  let revealContainers = document.querySelectorAll(".reveal");

  revealContainers.forEach((container) => {
    let image = container.querySelector("img");
    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        toggleActions: "restart none none reset"
      }
    });

    tl.set(container, { autoAlpha: 1 });
    tl.from(container, 1.5, {
      xPercent: -100,
      ease: Power2.out
    });
    tl.from(image, 1.5, {
      xPercent: 100,
      scale: 1.3,
      delay: -1.5,
      ease: Power2.out
    });
  });


  // Testimonial Carousel
  var swiperTesti = new Swiper(".testi-carousel", {
    slidesPerView: 3,
    spaceBetween: 24,
    slidesPerGroup: 1,
    loop: true,
    autoplay: true,
    grabcursor: true,
    speed: 600,
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    breakpoints: {
      320: {
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 25,
      },
      767: {
        slidesPerView: 2,
        slidesPerGroup: 1,
        spaceBetween: 30,
      },
      1024: {
        slidesPerView: 3,
        slidesPerGroup: 1,
      },
    },
  });

  // Testimonial Carousel 2
  var swiperTesti = new Swiper(".testi-carousel-2", {
    slidesPerView: 1,
    spaceBetween: 24,
    slidesPerGroup: 1,
    loop: true,
    autoplay: true,
    grabcursor: true,
    speed: 600,
    navigation: {
      nextEl: ".testimonial-section-4 .swiper-prev",
      prevEl: ".testimonial-section-4 .swiper-next",
    },
    breakpoints: {
      320: {
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 25,
      },
      767: {
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 30,
      },
      1024: {
        slidesPerView: 1,
        slidesPerGroup: 1,
      },
    },
  });


  $(document).ready(function () {

    function sliderAnimations(elements) {
      var animationEndEvents = "webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend";
      elements.each(function () {
        var $this = $(this);
        var $animationDelay = $this.data("delay");
        var $animationDuration = $this.data("duration");
        var $animationType = "runok-animation " + $this.data("animation");
        $this.css({
          "animation-delay": $animationDelay,
          "-webkit-animation-delay": $animationDelay,
          "animation-duration": $animationDuration,
        });
        $this.addClass($animationType).one(animationEndEvents, function () {
          $this.removeClass($animationType);
        });
      });
    }
    // Sliderthumb
    var sliderThumb = new Swiper(".slider-tab", {
      spaceBetween: 20,
      slidesPerView: 3,
    });
    var slider2Options = {
      speed: 1500,
      autoplay: {
        delay: 7000,
      },
      disableOnInteraction: false,
      initialSlide: 0,
      parallax: false,
      mousewheel: false,
      loop: true,
      grabCursor: true,
      effect: "fade",
      navigation: {
        nextEl: ".slider-arrow .slider-next",
        prevEl: ".slider-arrow .slider-prev",
      },
      thumbs: {
        swiper: sliderThumb,
      },
    };
    slider2Options.on = {
      slideChangeTransitionStart: function () {
        var swiper = this;
        var animatingElements = $(swiper.slides[swiper.activeIndex]).find("[data-animation]");
        sliderAnimations(animatingElements);
      },

      resize: function () {
        this.update();
      },
    };

    var swiper2 = new Swiper(".runok-slider", slider2Options);
  });

})(jQuery);

