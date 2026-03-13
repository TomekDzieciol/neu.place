import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export function ListingGallery({ photos, title }) {
  const validPhotos = Array.isArray(photos) ? photos.filter((p) => p?.url) : []
  const [selectedIndex, setSelectedIndex] = useState(0)

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  const scrollPrev = useCallback(() => {
    if (!emblaApi) return
    emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (!emblaApi) return
    emblaApi.scrollNext()
  }, [emblaApi])

  if (!validPhotos.length) return null

  return (
    <div className="mx-auto max-w-3xl space-y-4 mb-8">
      <div className="group relative mt-2">
        <div
          ref={emblaRef}
          className="overflow-hidden rounded-2xl bg-slate-900/95 shadow-xl ring-1 ring-slate-800/60"
        >
          <div className="flex">
            {validPhotos.map((photo) => (
              <div key={photo.url} className="flex-[0_0_100%]">
                <div className="aspect-video w-full">
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
                    <img
                      src={photo.url}
                      alt={title}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            scrollNext()
          }}
          className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-white/30 p-3 text-slate-900 shadow-lg backdrop-blur-sm transition hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 md:opacity-0 md:group-hover:opacity-100"
          aria-label="Następne zdjęcie"
          style={{ right: '0.75rem' }}
        >
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            scrollPrev()
          }}
          className="absolute left-3 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-white/30 p-3 text-slate-900 shadow-lg backdrop-blur-sm transition hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 md:opacity-0 md:group-hover:opacity-100"
          aria-label="Poprzednie zdjęcie"
          style={{ left: '0.75rem' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {validPhotos.map((photo, index) => (
              <span
                key={photo.url}
                className={`h-1.5 w-1.5 rounded-full transition ${
                  index === selectedIndex ? 'w-3 bg-cyan-400' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

