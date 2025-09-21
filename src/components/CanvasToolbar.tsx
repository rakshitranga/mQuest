"use client";
import React from "react";

export default function CanvasToolbar() {
  const handleDragStart = (e: React.DragEvent, type: "box" | "arrow") => {
    e.dataTransfer.setData("type", type);
  };

  return (
    <div 
      className="rounded-xl shadow-md p-5 mb-4"
      style={{
        backgroundColor: 'white'
      }}
    >
      <div className="flex flex-row gap-x-5 items-center">
        
        {/* Box item */}
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, "box")}
          className="px-3 py-2 text-white rounded-lg cursor-grab select-none hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <img src="/mquest_location.png" className="h-10 w-10" />
        </div>

        {/* Arrow item
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, "arrow")}
          className="px-3 py-2 bg-green-500 text-white rounded-lg cursor-grab select-none hover:bg-green-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          Connection
        </div> */}

        {/* Other placeholders */}
        <div className="px-3 py-2 text-gray-600 rounded-lg select-none flex items-center gap-2">
          <img src="/mquest_landmark.png" className="h-10 w-10"/>
        </div>
        
        {/* <div className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg select-none flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Timeline (Coming Soon)
        </div> */}
      </div>
    </div>
  );
}
