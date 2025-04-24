import { Review } from "@/types/product";

import Image from "next/image";
// import { formatDateFromTimestamp } from "./common/utils";

export const Reviews = ({ reviews }: { reviews: Review[] }) => {
   return (
      <div>
         {reviews.map((review: Review) => (
            <div className="flex flex-col gap-4" key={review.id}>
               {/* USER */}
               <div className="flex items-center gap-4 font-medium">
                  {/* <Image
               src={review.customer.avatar_url}
               alt=""
               width={32}
               height={32}
               className="rounded-full"
            /> */}
                  <span>{review.username}</span>
               </div>
               {/* STARS */}
               <div className="flex gap-1">
                  {Array.from({ length: review.stars }).map((_, index) => (
                     <Image src="/star.svg" alt="" key={index} width={16} height={16} />
                  ))}
               </div>
               {/* DESC */}
               {/* {review.date && <p>{formatDateFromTimestamp(review.date.toMillis())}</p>} */}
               {review.review && <p>{review.review}</p>}
               {/* <div className="">
            {review.media.map((media: any) => (
               <Image
                  src={media.url}
                  key={media.id}
                  alt=""
                  width={100}
                  height={50}
                  className="object-cover"
               />
            ))}
         </div> */}
            </div>
         ))}
      </div>
   );
};
