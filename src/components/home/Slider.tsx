"use client";
import Image from "next/image";
import Link from "next/link";
import { getSlides } from "@/queries";
import { useEffect, useState } from "react";
import { Slide } from "@/types/user";
import { useTranslations } from "next-intl";
const Slider = () => {
   const t = useTranslations("HomePage");
   const [current, setCurrent] = useState(0);
   const [slides, setSlides] = useState<Slide[]>([]);
   useEffect(() => {
      const fetchSlides = async () => {
         const newSlides = await getSlides();
         setSlides(newSlides.sort((a, b) => a.order - b.order));
      };
      fetchSlides();
   }, []);

   useEffect(() => {
      const interval = setInterval(() => {
         setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
      }, 6000);

      return () => clearInterval(interval);
   }, [slides]);

   return (
      <div className="h-[60vh] overflow-hidden relative">
         <div className="w-max h-full flex transition-all ease-in-out duration-1000" style={{ transform: `translateX(-${current * 100}vw)` }}>
            {slides.map((slide) => {
               let background;
               if (slide.background) {
                  const isGradient = slide.background.includes("gradient");
                  if (isGradient) {
                     const direction = slide.background.match(/gradient-to-(r|l|t|b|tr|tl|br|bl)/)?.[1] || "r";
                     const colors = slide.background.match(/\[([^\]]+)\]/g)?.map((color) => color.slice(1, -1)) || [];
                     background = {
                        type: "gradient",
                        direction: `to-${direction}`,
                        colors: colors.map((color, index) => ({
                           color,
                           position: index === 0 ? 0 : index === colors.length - 1 ? 100 : 50,
                        })),
                     };
                  } else {
                     const color = slide.background.match(/\[([^\]]+)\]/)?.[1] || "#000000";
                     background = {
                        type: "solid",
                        direction: "to-r",
                        colors: [{ color, position: 0 }],
                     };
                  }
               }
               return (
                  <div
                     className={`${!slide.background ? "bg-linear-to-r from-yellow-50 to-pink-50" : ""} w-screen h-full flex flex-col gap-6 xl:flex-row`}
                     key={slide.order}
                     style={
                        background
                           ? {
                                background:
                                   background.type === "solid"
                                      ? background.colors[0].color
                                      : `linear-gradient(${
                                           background.direction === "to-r"
                                              ? "to right"
                                              : background.direction === "to-l"
                                              ? "to left"
                                              : background.direction === "to-t"
                                              ? "to top"
                                              : background.direction === "to-b"
                                              ? "to bottom"
                                              : background.direction === "to-tr"
                                              ? "to top right"
                                              : background.direction === "to-tl"
                                              ? "to top left"
                                              : background.direction === "to-br"
                                              ? "to bottom right"
                                              : "to bottom left"
                                        }, ${background.colors
                                           .sort((a, b) => a.position - b.position)
                                           .map((stop) => `${stop.color} ${stop.position}%`)
                                           .join(", ")})`,
                             }
                           : {}
                     }
                  >
                     {/* TEXT CONTAINER */}
                     <div className="h-1/2 xl:w-1/2 xl:h-full flex flex-col items-center justify-center gap-5 2xl:gap-12 text-center">
                        <h2 className=" text-lg lg:text-2xl 2xl:text-4xl">{slide.description}</h2>
                        <h1 className="text-2xl lg:text-4xl 2xl:text-6xl font-semibold">{slide.title}</h1>
                        {slide.url && (
                           <Link href={slide.url}>
                              <button className="rounded-md bg-black text-white py-3 px-4 ">{t("buyNow")}</button>
                           </Link>
                        )}
                     </div>
                     {/* IMAGE CONTAINER */}
                     <div className="h-1/2 xl:w-1/2 xl:h-full relative">
                        <Image src={slide.image} alt="" fill sizes="100%" className="object-cover " />
                     </div>
                  </div>
               );
            })}
         </div>
         <div className="absolute m-auto left-1/2 bottom-8 flex gap-4 -translate-x-1/2">
            {slides.map((slide, index) => (
               <div className={`w-3 h-3  rounded-full ring-1 ring-gray-600 cursor-pointer flex items-center justify-center ${current === index ? "scale-150" : ""}`} key={slide.order} onClick={() => setCurrent(index)}>
                  {current === index && <div className="w-[6px] h-[6px] bg-gray-600 rounded-full"></div>}
               </div>
            ))}
         </div>
      </div>
   );
};

export default Slider;
