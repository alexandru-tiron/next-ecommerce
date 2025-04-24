"use client";

import Image from "next/image";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.css";
import { v4 } from "uuid";

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
            items.map((img) => (
               <div key={v4()} className="w-full h-20 relative">
                  <Image
                     src={img}
                     layout="fill"
                     objectFit="contain"
                     alt="logo"
                     className="max-h-[500px] "
                  ></Image>
               </div>
            ))
         }
      >
         {items.map((img, idx) => (
            <Image
               key={v4()}
               src={img}
               alt={` preview ${idx}`}
               // layout="responsive"
               width={650}
               height={650}
               objectFit="contain"
               priority={idx === 0}
               className="max-h-[500px] object-contain "
            ></Image>
         ))}
      </Carousel>
   );
};

export default ProductImages;
