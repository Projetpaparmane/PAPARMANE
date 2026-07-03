/***************************************************
==================== JS INDEX ======================
****************************************************

// Data Css js
// sticky header
// Register GSAP Plugins
// Smooth active
// GSAP Fade Animation 
// GSAP Fade Animation 
// Moving text	
// work-title animation 	
// Preloader Animation
// side-toggle animaton
// Side Info Js
// Creative Agency menu style
// Video Production Agency menu Animaton
// meanmenu activation 
// Magnific Video popup
// GSAP title animation
// Animation Word
// client slider 
// works-wrapper-box-2
// testimonial active
// testimonial 3 active
// portfolio 3 active 
// portfolio 3 active 
// portfolio 17 active
// testimonial 17 active
// Moving Gallery
// Text Invert With Scroll
// testimonial 4 active
// gsap nav
// rogress-bar
// client-testimonial
// Service list Hover Animation (Combined)
// Moving Gallery
// Moving team	
// about-4-title-shape animation 
// Moving brand	
// service area animation 
// Animate the image scaling to fullscreen, keeping center position
// Labels fade in with horizontal movement
// counter section
// scale animation 
// Play video in hover
// tagline animation
// pin on bottom
// woking card
// Menu slider hover effect
// Split titles into letters
// portfolio-full
// portfolio-activ
// cubes parallax  
// to view all pages in dark 


****************************************************/

(function ($) {
  "use strict";

  var windowOn = $(window);
  let mm = gsap.matchMedia();

  // Data Css js
  $("[data-background]").each(function () {
    $(this).css(
      "background-image",
      "url( " + $(this).attr("data-background") + "  )"
    );
  });

  //  sticky header
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
        // Scrolling up, remove the class
        $('.header-sticky').addClass('sticky');
        $('.header-sticky').removeClass('transformed');
      }
      lastScrollTop = currentScrollTop;
    });
  }
  pinned_header();

  // Register GSAP Plugins
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, CustomEase);

  // Smooth active
  var device_width = window.screen.width;

  if (device_width > 767) {
    if (document.querySelector("#has_smooth").classList.contains("has-smooth")) {
      const smoother = ScrollSmoother.create({
        // smooth: 0.9,
        smooth: 1.5,
        effects: device_width < 1025 ? false : true,
        smoothTouch: 0.1,
        // normalizeScroll: false,
        normalizeScroll: {
          allowNestedScroll: true,
        },
        ignoreMobileResize: true,
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

  // work-title animation 
  if (document.querySelectorAll(".work-title").length > 0) {
    let work_title_anim = document.querySelector(".work-title")
    if (work_title_anim) {
      let content_1 = document.querySelector(".first")
      let content_2 = document.querySelector(".last")

      gsap.to(content_1, {
        marginLeft: "0",
        ease: "none",
        scrollTrigger: {
          trigger: work_title_anim,
          scrub: 2,
          start: 'top 90%',
          end: "top center",
        }
      })

      gsap.to(content_2, {
        marginRight: "0",
        ease: "none",
        scrollTrigger: {
          trigger: work_title_anim,
          scrub: 2,
          start: 'top 90%',
          end: "top center",
        }
      })
    }
  }

  // Preloader
  $(document).ready(function () {
    $('#container').addClass('loaded');
    if ($('#container').hasClass('loaded')) {
      $('#preloader').delay(1000).queue(function () {
        $(this).remove();
      });
    }
  });

  // side-toggle animaton
  document.addEventListener("DOMContentLoaded", () => {
    const dotGrid = document.querySelector(".side-toggle");

    if (dotGrid) {
      const dotSize = 4;
      const gapX = 5;
      const gapY = 5;
      const centerOffset = 27;

      const baseOffset = dotSize + gapX;
      const baseOffsetY = dotSize + gapY;

      const positions = [
        { x: 0, y: 0 },
        { x: baseOffset, y: 0 },
        { x: baseOffset * 2, y: 0 },
        { x: 0, y: baseOffsetY },
        { x: baseOffset, y: baseOffsetY },
        { x: baseOffset, y: baseOffsetY * 2 },
        { x: baseOffset * 2, y: baseOffsetY * 2 },
      ];

      const originalPositions = [...positions];
      const dots = [];

      function setDotPosition(dot, pos) {
        dot.style.left = `${centerOffset + pos.x - baseOffset}px`;
        dot.style.top = `${centerOffset + pos.y - baseOffsetY}px`;
      }

      positions.forEach(pos => {
        const dot = document.createElement("div");
        dot.classList.add("dot");
        setDotPosition(dot, pos);
        dotGrid.appendChild(dot);
        dots.push(dot);
      });

      function applyShuffledPositions() {
        const shuffled = [...positions].sort(() => Math.random() - 0.5);
        dots.forEach((dot, i) => setDotPosition(dot, shuffled[i]));
      }

      function resetPositions() {
        dots.forEach((dot, i) => setDotPosition(dot, originalPositions[i]));
      }

      dotGrid.addEventListener("mouseenter", applyShuffledPositions);
      dotGrid.addEventListener("mouseleave", resetPositions);
    }
  });

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

  // Creative Agency menu style
  if (document.querySelectorAll(".header-area-3").length > 0) {
    const toggleBtn = document.getElementById("side-toggle");
    const sidebar = document.querySelector(".side-info");
    const closeBtn = document.getElementById("side-info-4-close");

    toggleBtn.addEventListener("click", () => {
      sidebar.classList.add("info-open");

      gsap.from(".socail-media li", {
        y: "-100%",
        opacity: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: "power3.out"
      });

      gsap.from(".nav-list li", {
        y: "-100%",
        opacity: 0,
        stagger: 0.1,
        delay: 0.3,
        duration: 0.9,
        ease: "power3.out"
      });
    });

    closeBtn.addEventListener("click", () => {
      sidebar.classList.remove("info-open");
    });
  }

  //  Video Production Agency menu Animaton 
  if (document.querySelectorAll(".side-info-4").length > 0) {
    const menuToggle = document.querySelector(".menu-toggle");
    const sidebar = document.querySelector(".side-info-4");
    const closeBtn = document.getElementById("side-info-4-close");

    const socialTl = gsap.timeline({ paused: true });
    const navTl = gsap.timeline({ paused: true });

    socialTl.from(".socail-media li", {
      x: "-50%",
      opacity: 0,
      stagger: 0.1,
      duration: 0.6,
      ease: "power3.out"
    });

    navTl.from(".nav-list li", {
      x: "-50%",
      opacity: 0,
      stagger: 0.1,
      duration: 0.6,
      ease: "power3.out"
    });

    menuToggle.addEventListener("click", () => {
      sidebar.classList.add("info-open");
      socialTl.play();
      navTl.play(0);
    });

    closeBtn.addEventListener("click", () => {
      socialTl.reverse();
      navTl.reverse();

      const totalDuration = Math.max(socialTl.duration(), navTl.duration()) * 300;

      setTimeout(() => {
        sidebar.classList.remove("info-open");
      }, totalDuration);
    });
  }

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

  // Magnific Video popup
  if ($('.video-popup').length && 'magnificPopup' in jQuery) {
    $('.video-popup').magnificPopup({
      type: 'iframe',
    });
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
          stagger: 0.2
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

  // client slider 
  if (document.querySelectorAll(".client-slider-active").length > 0) {
    if ('.client-slider-active') {
      var client_slider_active = new Swiper(".client-slider-active", {
        slidesPerView: 'auto',
        loop: true,
        autoplay: true,
        spaceBetween: 145,
        speed: 5000,
        allowTouchMove: false,
        autoplay: {
          delay: 1,
        },
        breakpoints: {
          0: {
            spaceBetween: 50,
          },
          768: {
            spaceBetween: 100,
          },
          1200: {
            spaceBetween: 145,
          }
        }
      });
    }
  }

  // works-wrapper-box-2
  if ($('.works-wrapper-box-2').length > 0 && window.innerWidth > 768) {

    let work_area_2 = gsap.timeline({
      scrollTrigger: {
        trigger: ".works-wrapper-box-2",
        start: "top 0%s",
        end: "bottom 70%",
        pin: ".section-header",
        markers: false,
        pinSpacing: false,
        scrub: 3,
      },
    });
  }

  // testimonial active 
  if (document.querySelectorAll(".testimonial-active").length > 0) {
    var testimonial_slider_active = new Swiper(".testimonial-active", {
      slidesPerView: 1,
      loop: true,
      autoplay: true,
      spaceBetween: 30,
      centeredSlides: true,
      speed: 2000,
      autoplay: false,
      pagination: {
        el: ".testimonial-pagination",
        clickable: true,
      },
    });
  }

  // testimonial 3 active
  if (document.querySelectorAll(".testimonial-3-active").length > 0) {
    var testimonial_3_active = new Swiper(".testimonial-3-active", {
      loop: true,
      slidesPerView: 1,
      spaceBetween: 5,
      speed: 2000,
      watchSlidesProgress: true,
      navigation: {
        prevEl: ".testimonial-3-button-prev",
        nextEl: ".testimonial-3-button-next",
      },
      breakpoints: {
        // when window width is >= px
        576: {
          slidesPerView: 1,
        },
        768: {
          slidesPerView: 1,
        },
        992: {
          slidesPerView: 2,
        },
        1201: {
          slidesPerView: 3,
        },
        1367: {
          slidesPerView: 3,
        },
      }
    });
  }

  // portfolio 3 active 
  if (document.querySelectorAll(".portfolio-3-active").length > 0) {
    var portfolio_3_active = new Swiper(".portfolio-3-active", {
      slidesPerView: 1,
      loop: true,
      autoplay: true,
      spaceBetween: 5,
      speed: 5000,
      slidesPerGroup: 1,
      navigation: {
        prevEl: ".portfolio-3-button-prev",
        nextEl: ".portfolio-3-button-next",
      },
      breakpoints: {
        576: {
          slidesPerView: 2,
          slidesPerGroup: 2,

        }
      }
    });
  }

  // portfolio 3 active 
  if (document.querySelectorAll(".portfolio-3-active").length > 0) {
    var portfolio_3_active = new Swiper(".portfolio-3-active", {
      slidesPerView: 1,
      loop: true,
      autoplay: true,
      spaceBetween: 5,
      speed: 2000,
      slidesPerGroup: 1,
      navigation: {
        prevEl: ".portfolio-3-button-prev",
        nextEl: ".portfolio-3-button-next",
      },
      breakpoints: {
        576: {
          slidesPerView: 2,
          slidesPerGroup: 2,

        }
      }
    });
  }

  // portfolio 17 active
  if (document.querySelectorAll(".portfolio-17-active").length > 0) {
    var portfolio_17_active = new Swiper(".portfolio-17-active", {
      loop: true,
      slidesPerView: 1,
      spaceBetween: 20,
      speed: 1000,
      autoplay: true,
      watchSlidesProgress: true,
      navigation: {
        prevEl: ".portfolio-17-button-prev",
        nextEl: ".portfolio-17-button-next",
      },
      breakpoints: {
        576: {
          slidesPerView: 1,
        },
        768: {
          slidesPerView: 2,
        },
        992: {
          slidesPerView: 3,
        },
        1201: {
          slidesPerView: 4,
          spaceBetween: 40,

        }
      }
    });
  }

  // testimonial 17 active
  if (document.querySelectorAll(".testimonial-17-active").length > 0) {
    var testimonial_17_active = new Swiper(".testimonial-17-active", {
      loop: true,
      slidesPerView: 1,
      spaceBetween: 20,
      speed: 1000,
      autoplay: true,
      watchSlidesProgress: true,
      navigation: {
        prevEl: ".testimonial-17-button-prev",
        nextEl: ".testimonial-17-button-next",
      },
      breakpoints: {
        576: {
          slidesPerView: 1,
        },
        768: {
          slidesPerView: 1,
        },
        992: {
          slidesPerView: 2,
        },
        1201: {
          slidesPerView: 3,
        },
        1800: {
          slidesPerView: 3.4,
        },
      }
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
          scrub: 1,
        }
      });
    });
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

  // testimonial 4 active
  if (document.querySelectorAll(".testimonial-4-active").length > 0) {
    var testimonial_4_active = new Swiper(".testimonial-4-active", {
      loop: true,
      slidesPerView: 1,
      spaceBetween: 40,
      speed: 2000,
      watchSlidesProgress: true,
      pagination: {
        el: ".testimonial-4-pagination",
        clickable: true,
      },
    });
  }

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

  // rogress-bar
  if (document.querySelectorAll(".progress-bar").length > 0) {
    const bars = document.querySelectorAll('.progress-bar');
    const countTexts = document.querySelectorAll('.count-text');

    function animateToValue(bar, targetValue, countText) {
      let currentValue = parseInt(bar.style.height) || 0;

      const interval = setInterval(() => {
        const current = parseInt(bar.style.height) || 0;
        if (current < targetValue) {
          bar.style.height = (current + 1) + '%';
          countText.textContent = (current + 1) + '%';
        } else if (current > targetValue) {
          bar.style.height = (current - 1) + '%';
          countText.textContent = (current - 1) + '%';
        } else {
          clearInterval(interval);
        }
      }, 15);
    }

    function startOnScroll() {
      const section = document.getElementById('skills-section');

      const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            bars.forEach((bar, index) => {
              const target = parseInt(bar.getAttribute('data-value'));
              animateToValue(bar, target, countTexts[index]);
            });
            sectionObserver.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.5
      });

      sectionObserver.observe(section);
    }
    startOnScroll();
  }

  // client-testimonial
  mm.add("(min-width: 1200px)", () => {
    if (document.querySelectorAll(".client-testimonial").length > 0) {
      const title = document.querySelector(".section-3-title-wrapper");
      const items = gsap.utils.toArray(".client-testimonial__item");

      let tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".client-testimonial",
          start: "top 0%",
          end: "+=400%",
          scrub: 0,
          pin: true
        }
      });

      tl.to(title, {
        opacity: 0,
        webkitFilter: "blur(10px)",
        scrollTrigger: {
          trigger: ".client-testimonial",
          start: "top 0%",
          end: "+=200%",
          scrub: true,
        }
      });

      tl.add("startItems", "+=0.9");

      items.forEach((item, index) => {
        const delay = index * 0.6;
        tl.fromTo(
          item,
          { x: "450%", opacity: 1 },
          { x: 0, opacity: 1, duration: 1 },
          `startItems+=${delay}`
        );
      });

      const totalItemDuration = (items.length - 1) * 0.6 + 1;
      tl.to({}, { duration: 2 }, `startItems+=${totalItemDuration}`);
    }
  });

  // Service list Hover Animation (Combined)
  function Team_animation() {
    const wrappers = [".service-5__wrapper", ".service-9__wrapper", ".service-10__wrapper"];

    wrappers.forEach(wrapperClass => {
      const wrapper = $(wrapperClass);
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
      wrapper.find(`${wrapperClass.replace("__wrapper", "__item")}`).on("mouseenter", function () {
        moveBgTo($(this));
      });

      // On leave, hide background
      wrapper.on("mouseleave", function () {
        active_bg.css({
          opacity: 0,
          height: 0
        });
      });
    });
  }

  $(document).ready(function () {
    Team_animation();
  });

  // Moving Gallery		
  if ($('.fun-fact-area-inner').length > 0 && window.innerWidth > 767) {
    gsap.utils.toArray('.fun-fact-area-inner').forEach((section, index) => {
      const w = section.querySelector('.fun-fact-wrapper');
      const [x, xEnd] = (index % 2) ? [(section.offsetWidth - w.scrollWidth), 0] : [0, section.offsetWidth - w.scrollWidth];
      gsap.fromTo(w, { x }, {
        x: xEnd,
        scrollTrigger: {
          trigger: ".fun-fact-area",
          scrub: 1,
          start: "bottom bottom",
          pin: true,
        }
      });
    });
  }

  // Moving team		
  if ($('.team-area-4-inner').length > 0 && window.innerWidth > 1200) {
    gsap.utils.toArray('.team-area-4-inner').forEach((section, index) => {
      const w = section.querySelector('.team-4-wrapper');
      const [x, xEnd] = (index % 2) ? [(section.offsetWidth - w.scrollWidth), 0] : [0, section.offsetWidth - w.scrollWidth];
      gsap.fromTo(w, { x }, {
        x: xEnd,
        scrollTrigger: {
          trigger: ".team-area-4",
          scrub: 1,
          start: "bottom bottom",
          pin: true,
        }
      });
    });
  }

  // about-4-title-shape animation 
  if (document.querySelectorAll(".about-4-title-shape").length > 0) {
    ScrollTrigger.matchMedia({
      "(min-width: 1400px)": function () {
        var ab4 = gsap.timeline();
        ab4.to(".about-4-title-shape img", {
          width: "40px",
          height: "40px",
          marginLeft: 50,
          rotation: 180,
          ease: "none",
          scrollTrigger: {
            trigger: ".about-4-title-shape",
            start: "center center",
            endTrigger: ".client-area-4",
            end: "bottom bottom",
            pin: true,
            pinSpacing: false,
            scrub: 0,
          }
        })
        ab4.to(".title-4-text-last", {
          translateX: "1.4em",
          ease: "power2.out",
          display: "inline-block",
          scrollTrigger: {
            trigger: ".title-4-text-last",
            start: "center bottom",
            end: "center center",
            pinSpacing: false,
            scrub: 2,
          }
        })
        ab4.to(".about-4-title-shape img", {
          translateX: 450,
          ease: "none",
          scrollTrigger: {
            trigger: ".client-area-4",
            start: "bottom bottom",
            end: "+=80%",
            pin: ".about-area-4",
            pinSpacing: true,
            scrub: 0,
          }
        })
        ab4.to(".about-4-title-shape img", {
          scale: 400,
          rotation: 90,
          ease: "power2.in",
          scrollTrigger: {
            trigger: ".client-area-4",
            start: "bottom 20%",
            end: "+=100%",
            pin: ".about-area-4",
            pinSpacing: true,
            scrub: 0,
          }
        })
      },
      "(min-width: 1200px) and (max-width: 1399px)": function () {
        var ab4 = gsap.timeline();
        ab4.to(".about-4-title-shape img", {
          width: "40px",
          height: "40px",
          marginLeft: 50,
          rotation: 180,
          ease: "none",
          scrollTrigger: {
            trigger: ".about-4-title-shape",
            start: "center center",
            endTrigger: ".client-area-4",
            end: "bottom bottom",
            pin: true,
            pinSpacing: false,
            scrub: 0,
          }
        })
        ab4.to(".title-4-text-last", {
          translateX: "1.7em",
          ease: "power2.out",
          display: "inline-block",
          scrollTrigger: {
            trigger: ".title-4-text-last",
            start: "center bottom",
            end: "center center",
            pinSpacing: false,
            scrub: 2,
          }
        })
        ab4.to(".about-4-title-shape img", {
          translateX: 350,
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: ".client-area-4",
            start: "bottom bottom",
            end: "+=80%",
            pin: ".about-area-4",
            pinSpacing: true,
            scrub: 0,
          }
        })
        ab4.to(".about-4-title-shape img", {
          scale: 400,
          rotation: 90,
          ease: "power2.in",
          scrollTrigger: {
            trigger: ".client-area-4",
            start: "bottom 20%",
            end: "+=100%",
            pin: ".about-area-4",
            pinSpacing: true,
            scrub: 0,
          }
        })
      },
    });
  }

  // Moving brand		
  if (document.querySelectorAll(".moving-brand").length > 0) {
    mm.add("(min-width: 1200px)", () => {
      gsap.utils.toArray('.moving-brand').forEach((section, index) => {
        const w = section.querySelector('.wrapper-brand');
        const [x, xEnd] = (index % 2) ? [(section.offsetWidth - w.scrollWidth), 0] : [0, section.offsetWidth - w.scrollWidth];
        gsap.fromTo(w, { x }, {
          x: xEnd,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            scrub: 0.5,
            start: "20% bottom",
            end: "80% 30%",
          }
        });
      });
    });
  }

  // service area animation 
  if (document.querySelectorAll(".service-area").length > 0) {
    mm.add("(min-width: 1200px)", () => {
      const tl = gsap.timeline();

      tl.to(".services-wrapper-1 .service-box-1", {
        x: 0,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: ".services-wrapper-box",
          start: "top top",
          end: "+=50%",
          toggleActions: "play complete play reverse",
          pin: true,
          scrub: 0,
        }
      });

      tl.to(".add-shape-wrapper", {
        transform: "translate(0, 0)",
        ease: "none",
        scrollTrigger: {
          trigger: ".add",
          start: "top top",
          end: "center top",
          scrub: true,
          // markers: true,
        }
      });

      tl.to(".add-shape", {
        transform: "scale(860)",
        ease: "power2.in",
        scrollTrigger: {
          trigger: ".add",
          start: "center top",
          end: "bottom -=100%",
          pin: ".service-area",
          scrub: 0,
          // markers: true,
        }
      });
    });
  }

  // Animate the image scaling to fullscreen, keeping center position
  if ($('.hero-area-7').length > 0 && window.innerWidth > 1200) {
    gsap.to(".image-wrapper", {
      scrollTrigger: {
        trigger: ".hero-area-7",
        start: "top top",
        end: "bottom -=100%",
        scrub: 1,
        pin: true,
      },
      width: "100vw",
      height: "100vh",
      ease: "power4.inOut"
    });
  }

  // Labels fade in with horizontal movement
  if (document.querySelectorAll(".hero-area-7").length > 0) {
    gsap.to(".label-left", {
      scrollTrigger: {
        trigger: ".hero-area-7",
        start: "top 30%",
        end: "top 10%",
        scrub: true
      },
      opacity: 1,
      x: -10
    });

    gsap.to(".label-right", {
      scrollTrigger: {
        trigger: ".hero-area-7",
        start: "top 30%",
        end: "top 10%",
        scrub: true
      },
      opacity: 1,
      x: 10
    });
  }

  // counter section
  if ($('.funding-success').length > 0 && window.innerWidth > 767) {
    const counterElement = document.getElementById("counter");
    const finalValue = parseInt(counterElement.dataset.value);
    const prefix = counterElement.dataset.prefix || "";
    const suffix = counterElement.dataset.suffix || "";
    const counterObj = { value: 0 };

    counterElement.textContent = `${prefix}0${suffix}`;

    gsap.to(counterObj, {
      value: finalValue,
      scrollTrigger: {
        trigger: ".counter",
        start: "top 5%",
        end: "+=1000",
        scrub: true,
        pin: true,
      },
      onUpdate: () => {
        counterElement.textContent = `${prefix}${Math.floor(counterObj.value)}${suffix}`;
      }
    });

  }

  const serviceItems = document.querySelectorAll('.portfolio-6-item');

  serviceItems.forEach(item => {
    const hoverImage = item.querySelector('.hover-image');
    const hoverImgEl = hoverImage.querySelector('.hover-img');
    const hoverTextTitle = hoverImage.querySelector('.hover-text h4');
    const hoverTextSubtitle = hoverImage.querySelector('.hover-text p');

    let animationFrameId;
    let target = { x: 0, y: 0 };
    let current = { x: 0, y: 0 };
    let tracking = false;

    let scale = 0.1;
    let scaleTarget = 1;

    function animateImageFollow() {
      if (!tracking) return;

      current.x += (target.x - current.x) * 0.2;
      current.y += (target.y - current.y) * 0.2;
      scale += (scaleTarget - scale) * 0.1;

      hoverImage.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) scale(${scale})`;

      animationFrameId = requestAnimationFrame(animateImageFollow);
    }

    item.addEventListener('mouseenter', (e) => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      const rect = item.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      target.x = current.x = mouseX;
      target.y = current.y = mouseY;

      const imgSrc = item.getAttribute('data-img');
      const title = item.getAttribute('data-title');
      const subtitle = item.getAttribute('data-subtitle');

      hoverImgEl.src = imgSrc;
      hoverTextTitle.textContent = title;
      hoverTextSubtitle.textContent = subtitle;

      hoverImage.style.opacity = 1;
      scale = 0.1;
      scaleTarget = 1;

      hoverImage.style.clipPath = 'inset(0%)';

      tracking = true;
      animationFrameId = requestAnimationFrame(animateImageFollow);
    });

    item.addEventListener('mousemove', (e) => {
      if (!tracking) return;

      const rect = item.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const imgWidth = hoverImage.offsetWidth || 420;
      const imgHeight = hoverImage.offsetHeight || 300;

      const maxX = rect.width - imgWidth;
      const maxY = rect.height - imgHeight;

      target.x = Math.max(0, Math.min(mouseX, maxX));
      target.y = Math.max(0, Math.min(mouseY, maxY));
    });

    item.addEventListener('mouseleave', () => {
      tracking = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      hoverImage.style.opacity = 0;
      hoverImage.style.clipPath = 'inset(40%)';
      hoverImage.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) scale(0.5)`;

      setTimeout(() => {
        hoverImage.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) scale(0.1)`;
      }, 300);
    });
  });

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

  // Play video in hover
  const videos = document.querySelectorAll(".video");

  for (const video of videos) {
    video.muted = true;
    video.addEventListener('mouseover', () => {
      video.play().catch((e) => console.log("Playback error:", e));
    }, false);

    video.addEventListener('mouseout', () => {
      video.pause();
    }, false);
  }

  // tagline animation 
  if (document.querySelectorAll(".tagline-8-list-wrapper-box").length > 0) {
    mm.add("(min-width: 1200px)", () => {
      gsap.utils.toArray('.tagline-8-list-wrapper-box').forEach((listRotatorWrapper) => {

        const listRotatorPin = listRotatorWrapper.querySelector(".tagline-8-list-wrapper");
        const listRotator = listRotatorWrapper.querySelector(".tagline-8-list");

        const rTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: listRotatorPin,
            start: function () {
              const startPin = 0;
              return "top +=" + startPin;
            },
            end: function () {
              const endPin = window.innerHeight * 3;
              return "+=" + endPin;
            },
            pin: true,
            scrub: true,
          }
        });

        const listItems = gsap.utils.toArray('.tagline-8-list li');
        const stagger = 0.5;

        listItems.forEach((listItem, index) => {
          rTimeline.from(listItem, {
            duration: 1,
            opacity: 0.2,
            delay: index * 0.5,
          });
        });

        gsap.to(listRotator, {
          scrollTrigger: {
            trigger: listRotatorWrapper,
            start: function () {
              const startPin = 0;
              return "top +=" + startPin;
            },
            end: function () {
              const endPin = window.innerHeight * 3;
              return "+=" + endPin;
            },
            scrub: true,
          },
          y: - (listRotator.offsetHeight - window.innerHeight)
        });

      });
    });
  }

  // pin on bottom
  mm.add("(min-width: 1200px)", () => {
    var pin_on_bottom = document.querySelectorAll(".pin-on-bottom");
    pin_on_bottom.forEach((el) => {
      gsap.to(el, {
        paddingBottom: "500px",
        ease: "none",
        scrollTrigger: {
          trigger: el,
          pin: true,
          start: "bottom 90%",
          end: "bottom top",
          pinSpacing: false,
          scrub: 3,
          // markers: true,
        },
      });
    });
  });

  // woking card
  if (document.querySelectorAll(".works-16-wrapper").length > 0) {
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

  // Menu slider hover effect
  $('.menu-slider-item').on("mouseenter", function () {
    $('#menu-slider-wrap').removeClass().addClass($(this).attr('rel'));
    $(this).addClass('active').siblings().removeClass('active');
  });

  function applyFlipAnimation() {
    document.querySelectorAll('.flip-char').forEach(button => {
      if (button.querySelector('.flip-char span')) return;

      const originalText = button.textContent;

      button.innerHTML = '<span>' +
        originalText.split('').map(char =>
          char === ' ' ? '&nbsp;' : char
        ).join('</span><span>') +
        '</span>';

      const spans = button.querySelectorAll('span');
      spans.forEach((span, index) => {
        span.style.transitionDelay = `${index * 0.02}s`;
      });
    });
  }

  $(document).ready(function () {
    applyFlipAnimation();
  });

  if ($('.Projects-area-10').length > 0) {
    let mm = gsap.matchMedia();
    mm.add("(min-width: 768px)", () => {
      return gsap.to('.Projects-area-10', {
        opacity: 1,
        scrollTrigger: {
          trigger: '.Projects-area-10',
          scrub: 1,
          start: 'top top',
          end: "bottom 100%",
          pin: '.Projects__content',
          pinSpacing: false,
          toggleActions: 'play reverse play reverse',
        }
      });
    });
  }

  if (document.querySelector(".Projects-area-10") && window.innerWidth > 768) {
    const projectArea = document.querySelector(".Projects-area-10");
    const steps = document.querySelectorAll(".Projects__content ul li");
    const stepCount = steps.length;

    const fill = document.querySelector(".Projects-area-10__fill");
    const current = document.getElementById("Projects-area-10__current");
    const total = document.getElementById("Projects-area-10__total");

    if (total) total.textContent = String(stepCount).padStart(2, '0');

    ScrollTrigger.create({
      trigger: projectArea,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: ({ progress }) => {
        const step = Math.min(stepCount, Math.max(1, Math.floor(progress * (stepCount - 1)) + 1));
        const width = (step / stepCount) * 100;

        if (fill) fill.style.width = `${width}%`;
        if (current) current.textContent = String(step).padStart(2, '0');

        steps.forEach((li, index) => {
          li.classList.toggle("active", index + 1 === step);
        });
      }
    });
  }

  // Split titles into letters
  document.addEventListener("DOMContentLoaded", () => {
    const wraps = document.querySelectorAll("[data-title-wrap]");
    if (!wraps.length) return;

    const letterTargets = document.querySelectorAll("[data-title-element]");
    new SplitType(letterTargets, { types: "words, chars" });

    wraps.forEach((wrap) => {
      const title = wrap.querySelector("[data-title-element]");
      const direction = title.getAttribute("data-title-element");

      const fromY = direction === "down" ? "-150%" : "150%";
      const toY = "0%";
      const rotateFrom = direction === "down" ? "-15deg" : "15deg";
      const rotateTo = "0deg";

      gsap.fromTo(
        title.querySelectorAll(".char"),
        {
          y: fromY,
          rotate: rotateFrom,
          opacity: 0,
        },
        {
          y: toY,
          rotate: rotateTo,
          opacity: 1,
          duration: 1.5,
          stagger: 0.05,
          ease: "power3.out",
          scrollTrigger: {
            trigger: wrap,
            start: "top 80%",
            end: "top 30%",
            scrub: 1,
            toggleActions: "play none none none",
          },
        }
      );
    });
  });

  // portfolio-full
  document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector(".portfolio-full")) {
      const interleaveOffset = 0.75;
      var portfolio_4_activ = new Swiper('.portfolio-full-activ', {
        loop: true,
        direction: "vertical",
        autoplay: false,
        speed: 2000,
        watchSlidesProgress: true,
        allowTouchMove: false,
        mousewheelControl: false,
        mousewheel: false,
        pagination: {
          el: ".portfolio-full-pagination",
          clickable: true,
          renderBullet: function (index, className) {
            const bulletElement = document.querySelectorAll('.pagination-bullet')[index];
            const text = bulletElement.getAttribute('data-text');
            return '<span class="' + className + ' pagination-bullet" data-text="' + text + '">' + bulletElement.innerHTML + '</span>';
          },
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
              swiper.slides[i].querySelector(".slide-inner").style.transition = speed + "ms";
            }
          }
        }
      });

      const paginationBullets = document.querySelectorAll('.portfolio-full-pagination .pagination-bullet');

      paginationBullets.forEach((bullet, index) => {
        bullet.addEventListener('mouseenter', () => {
          portfolio_4_activ.slideTo(index + 1);
        });
      });
    }
  });

  // portfolio-activ
  const swiper = new Swiper('.portfolio-activ', {
    loop: true,
    speed: 2000,
    effect: 'creative',
    loop: true,
    speed: 3000,
    mousewheel: true,
    pagination: {
      el: '.portfolio-pagination',
      clickable: true,
    },
    creativeEffect: {
      perspective: true,
      prev: {
        translate: ['-60%', 0, -3000],
      },
      next: {
        translate: ['60%', 0, -3000],
      },
    },
    on: {
      init: () => {
        const slides = document.querySelectorAll('.swiper-slide');
        slides.forEach(slide => {
          slide.style.width = '100%';
          slide.style.height = '100vh';
        });
      }
    }
  });

  // cubes parallax  
  var timeout;
  $('#cube-container').mousemove(function (e) {
    if (timeout) clearTimeout(timeout);
    setTimeout(callParallax.bind(null, e), 200);

  });

  function callParallax(e) {
    parallaxIt(e, '.cube-one', -50);
    parallaxIt(e, '.cube-two', -50);
    parallaxIt(e, '.cube-three', -50);
  }

  function parallaxIt(e, target, movement) {
    var $this = $('#cube-container');
    var relX = e.pageX - $this.offset().left;
    var relY = e.pageY - $this.offset().top;

    TweenMax.to(target, 1, {
      x: (relX - $this.width() / 2) / $this.width() * movement,
      y: (relY - $this.height() / 2) / $this.height() * movement,
      ease: Power2.easeOut
    })
  }

  // to view all pages in dark 
  document.querySelector("body").classList.add("dark");

})(jQuery);


