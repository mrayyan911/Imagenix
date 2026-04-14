'use client';

const logos = [
  'PyTorch', 'TensorFlow', 'YOLO', 'Roboflow', 'Hugging Face',
  'OpenCV', 'COCO', 'Pascal VOC', 'CVAT', 'Label Studio',
];

export function LogoTicker() {
  return (
    <div className="relative overflow-hidden py-4">
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-white to-transparent" />
      <div className="flex gap-12 animate-ticker whitespace-nowrap">
        {[...logos, ...logos].map((logo, i) => (
          <span
            key={i}
            className="inline-flex items-center px-5 py-2 rounded-full bg-neutral-100 text-sm font-medium text-neutral-500 border border-neutral-200 shrink-0"
          >
            {logo}
          </span>
        ))}
      </div>
    </div>
  );
}
