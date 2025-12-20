// 'use client';

// import TagsClient from '../components/TagsClient';

// export default function TagsPage() {
//   return <TagsClient />;
// }
//       name,
//                     <Link
//                       key={t?.id || slug}
//                       href={`/tags/${encodeURIComponent(slug)}/`}
//                       className="flex flex-col items-start justify-between px-4 py-3 bg-slate-900/60 hover:bg-slate-900/70 rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/20 relative group"
//                     >
//                       <span className="font-semibold text-white truncate">#{name}</span>
//                       <div className="flex items-center justify-between w-full mt-2">
//                         <span className="text-xs text-cyan-400 font-medium">
//                           {count} {count === 1 ? 'story' : 'stories'}
//                         </span>
//                         <button
//                           onClick={(e) => handleShareTag(t, e)}
//                           className="text-gray-400 hover:text-white hover:scale-110 transition-all duration-200"
//                           aria-label="Share tag"
//                           title="Share this tag"
//                         >
//                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
//                           </svg>
//                         </button>
//                       </div>
//                     </Link>
//                   );
//                 })
//               ) : (
//                 <div className="col-span-full text-center text-gray-400">
//                   {error ? 'Unable to load tags at this time.' : 'No tags found.'}
//                 </div>
//               )}
//             </section>
//           </div>
//         </div>
//       </div>

//       {/* Share Modal */}
//       {selectedTag && (
//         <ShareModal
//           isOpen={shareModalOpen}
//           onClose={() => {
//             setShareModalOpen(false);
//             setSelectedTag(null);
//           }}
//           shareData={{
//             title: `Explore #${selectedTag.name}`,
//             description: `Check out the #${selectedTag.name} tag on StoryVermo with ${selectedTag.count} ${selectedTag.count === 1 ? 'story' : 'stories'}. Discover amazing stories and join our creative community!`,
//             url: selectedTag.url
//           }}
//           imageUrl={selectedTag.image}
//         />
//       )}

//       {/* JSON-LD structured data for tags to improve SEO */}
//       <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
//         "@context": "https://schema.org",
//         "@type": "ItemList",
//         name: "Tags",
//         description: "List of tags on StoryVermo",
//         url: siteUrl('/tags/'),
//         itemListElement: (Array.isArray(tags) ? tags : []).map((t, i) => ({
//           "@type": "ListItem",
//           position: i + 1,
//           url: siteUrl(`/tags/${encodeURIComponent(t?.slug || (t?.name || '').toLowerCase().replace(/\s+/g, '-'))}/`),
//           name: t?.name || t
//         }))
//       }) }} />
//     </div>
//   );
// }
