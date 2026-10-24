"use client";

import Image from "next/image";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.css";

const ProductImages = ({ items, selected }: { items: string[]; selected?: string }) => {
   return (
      <Carousel
         showArrows={true}
         showStatus={false}
         showIndicators={false}
         swipeable={true}
         className=" h-full relative mt-4"
         selectedItem={selected ? items.indexOf(selected) : 0}
         renderThumbs={() =>
            items.map((img, idx) => (
               <div key={`${idx}-${img}`} className="w-full h-20 relative">
                  <Image src={img} fill sizes="80px" alt={`thumbnail ${idx}`} className="max-h-[500px] object-contain" />
               </div>
            ))
         }
      >
         {items.map((img, idx) => (
            <Image
               key={`${idx}-${img}`}
               src={img}
               alt={` preview ${idx}`}
               width={650}
               height={650}
               // The gallery takes half the page from lg up, the full width below
               sizes="(min-width: 1024px) 50vw, 100vw"
               priority={idx === 0}
               className="max-h-[500px] object-contain "
            />
         ))}
      </Carousel>
   );
};

export default ProductImages;
