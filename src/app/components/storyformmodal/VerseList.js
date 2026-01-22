import React from 'react';
import VerseItem from './VerseItem';

const VerseList = ({ 
  verses, 
  handleVerseImageUpload, 
  removeVerse, 
  setDeletedMoments, 
  setVerses, 
  handleDeleteVerseClick, 
  validationErrors, 
  editingVerse, 
  title, 
  handleVerseContentChange, 
  handleAddVerse 
}) => {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent flex-1"></div>
        <h3 className="text-2xl font-semibold text-purple-400 px-4 flex items-center gap-2">
          <span className="fas fa-scroll"></span> Story Verses
        </h3>
        <div className="h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent flex-1"></div>
      </div>
      
      <div className="verses-container" id="versesContainer">
        {verses.map((verse, index) => (
          <VerseItem 
            key={`verse-${verse.id || `temp-${index}`}`}
            verse={verse}
            index={index}
            onImageUpload={handleVerseImageUpload}
            onRemoveVerse={removeVerse}
            onDeleteMoment={(momentId) => setDeletedMoments(prev => [...prev, momentId])}
            onRemoveImage={(verseId, imgIndex) => {
              setVerses(prevVerses => 
                prevVerses.map(v => {
                  if (v.id === verseId) {
                    const newImageIds = [...v.imageIds];
                    const removed = newImageIds.splice(imgIndex, 1);
                    // Revoke object URL preview if present to avoid memory leaks
                    try {
                      if (removed && removed[0] && removed[0].preview && typeof removed[0].preview === 'string' && removed[0].preview.startsWith('blob:')) {
                        URL.revokeObjectURL(removed[0].preview);
                      }
                    } catch (e) {}
                    return { ...v, imageIds: newImageIds };
                  }
                  return v;
                })
              );
            }}
            onDeleteVerseClick={handleDeleteVerseClick}
            validationErrors={validationErrors}
            isEditingVerse={!!editingVerse}
            title={title}
            onVerseContentChange={handleVerseContentChange}
          />
        ))}
      </div>
      
      {validationErrors.verse_empty && (
        <p className="text-red-400 text-sm mt-2 ml-4">{validationErrors.verse_empty}</p>
      )}
      
      {!editingVerse && (
        <div className="flex justify-center mt-8">
          <button 
            onClick={handleAddVerse}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-medium flex items-center gap-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 border border-purple-500/30"
          >
            <span className="fas fa-plus text-xl"></span> Add Verse
          </button>
        </div>
      )}
    </div>
  );
};

VerseList.displayName = 'VerseList';

export default VerseList;