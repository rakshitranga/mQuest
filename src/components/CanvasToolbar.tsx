"use client";
import React from "react";

export default function CanvasToolbar() {
  const handleDragStart = (e: React.DragEvent, type: "box" | "arrow" | "gas-station" | "landmark") => {
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
          className="px-3 py-2 text-white rounded-lg cursor-grab select-none transition-colors flex items-center gap-2"
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
        

        {/* Gas Station Tool */}
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, "gas-station")}
          className="px-3 py-2 text-yellow-800 rounded-lg cursor-grab select-none transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
            <path fillRule="evenodd" d="M10.5 3.798v5.02a3 3 0 0 1-.879 2.121l-2.377 2.377a9.845 9.845 0 0 1 5.091 1.013 8.315 8.315 0 0 0 5.713.636l.285-.071-3.954-3.955a3 3 0 0 1-.879-2.121v-5.02a23.614 23.614 0 0 0-3 0Zm4.5.138a.75.75 0 0 0 .093-1.495A24.837 24.837 0 0 0 12 2.25a25.048 25.048 0 0 0-3.093.191A.75.75 0 0 0 9 3.936v4.882a1.5 1.5 0 0 1-.44 1.06l-6.293 6.294c-1.62 1.621-.903 4.475 1.471 4.88 2.686.46 5.447.698 8.262.698 2.816 0 5.576-.239 8.262-.697 2.373-.406 3.092-3.26 1.47-4.881L15.44 9.879A1.5 1.5 0 0 1 15 8.818V3.936Z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Landmark Tool */}
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, "landmark")}
          className="px-3 py-2 text-gray-600 rounded-lg cursor-grab select-none transition-colors flex items-center gap-2"
        >
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
