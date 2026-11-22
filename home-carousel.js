const slides = [
  { src: "assets/rigwise-home-pc.jpg", alt: "A custom-built desktop PC with blue-lit components" },
  { src: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=1400&q=82", alt: "A white PC tower with blue lighting and visible components" },
  { src: "https://images.unsplash.com/photo-1751374156944-aa91dee48408?auto=format&fit=crop&w=1400&q=82", alt: "A modern PC tower with colorful cooling lights" }
];

const image = document.querySelector("#hero-carousel-current");
const imageButton = document.querySelector("#hero-carousel-image");
const previousButton = document.querySelector("#hero-carousel-prev");
const nextButton = document.querySelector("#hero-carousel-next");
const dotsHost = document.querySelector("#hero-carousel-dots");
const status = document.querySelector("#hero-carousel-status");
if (!image || !imageButton || !previousButton || !nextButton || !dotsHost) throw new Error("PC photo carousel is missing required controls");

let current = 0;
const dots = slides.map((slide, index) => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = "hero-carousel-dot";
  dot.setAttribute("aria-label", "Show PC photo " + (index + 1) + " of " + slides.length);
  dot.addEventListener("click", () => showSlide(index));
  dotsHost.append(dot);
  return dot;
});

function showSlide(index) {
  current = (index + slides.length) % slides.length;
  const slide = slides[current];
  image.src = slide.src;
  image.alt = slide.alt;
  imageButton.setAttribute("aria-label", "Show next photo. Photo " + (current + 1) + " of " + slides.length);
  dots.forEach((dot, dotIndex) => dot.setAttribute("aria-current", String(dotIndex === current)));
  if (status) status.textContent = "Photo " + (current + 1) + " of " + slides.length + ": " + slide.alt;
}

imageButton.addEventListener("click", () => showSlide(current + 1));
nextButton.addEventListener("click", () => showSlide(current + 1));
previousButton.addEventListener("click", () => showSlide(current - 1));
showSlide(0);
