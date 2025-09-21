"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";

type Box = {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  address: string;
};

type Connection = {
  from: string; // box id
  fromSide: "top" | "bottom";
  to: string;   // box id
  toSide: "top" | "bottom";
};

interface CanvasProps {
  initialData?: {
    boxes: Box[];
    connections: Connection[];
  };
  onDataChange?: (data: { boxes: Box[]; connections: Connection[] }) => void;
}

export default function Canvas({ initialData, onDataChange }: CanvasProps) {
  const [boxes, setBoxes] = useState<Box[]>(initialData?.boxes || []);
  const [connections, setConnections] = useState<Connection[]>(initialData?.connections || []);

  // Update state when initialData changes
  useEffect(() => {
    if (initialData) {
      setBoxes(initialData.boxes || []);
      setConnections(initialData.connections || []);
    }
  }, [initialData]);
  const [draggingBox, setDraggingBox] = useState<string | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<{
    boxId: string;
    side: "top" | "bottom";
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Notify parent of data changes
  const notifyDataChange = useCallback((newBoxes: Box[], newConnections: Connection[]) => {
    if (onDataChange) {
      onDataChange({ boxes: newBoxes, connections: newConnections });
    }
  }, [onDataChange]);

  // Add box when dropped
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    
    if (type === "box") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Get custom title and description from drag data (from chat suggestions)
      const customTitle = e.dataTransfer.getData("title");
      const customDescription = e.dataTransfer.getData("description");

      const newBox = {
        id: `box-${Date.now()}`,
        x: x - 160, // Center the box (width/2)
        y: y - 66,  // Center the box (height/2)
        title: customTitle || "New Location",
        description: customDescription || "Click to edit description",
        address: customTitle || "Enter Address Line"
      };

      const newBoxes = [...boxes, newBox];
      setBoxes(newBoxes);
      notifyDataChange(newBoxes, connections);
    }
  }, [boxes, connections, notifyDataChange]);

  // Dragging boxes
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    const rect = (e.target as HTMLElement).closest(".box")?.getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !canvasRect) return;

    setDraggingBox(id);
    setOffset({
      x: e.clientX - rect.left + canvasRect.left,
      y: e.clientY - rect.top + canvasRect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingBox && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - offset.x;
      const y = e.clientY - rect.top - offset.y;

      const newBoxes = boxes.map((box) =>
        box.id === draggingBox ? { ...box, x, y } : box
      );
      setBoxes(newBoxes);
      notifyDataChange(newBoxes, connections);
    }
  };

  const handleMouseUp = () => {
    setDraggingBox(null);
  };

  // Connections
  const startConnection = (boxId: string, side: "top" | "bottom") => {
    setConnectingFrom({ boxId, side });
  };

  const finishConnection = (boxId: string, side: "top" | "bottom") => {
    if (connectingFrom && connectingFrom.boxId !== boxId) {
      const newConnections = [
        ...connections,
        {
          from: connectingFrom.boxId,
          fromSide: connectingFrom.side,
          to: boxId,
          toSide: side,
        },
      ];
      setConnections(newConnections);
      notifyDataChange(boxes, newConnections);
    }
    setConnectingFrom(null);
  };

  // Update box content
  const updateBox = (id: string, field: 'title' | 'description' | 'address', value: string) => {
    const newBoxes = boxes.map((box) =>
      box.id === id ? { ...box, [field]: value } : box
    );
    setBoxes(newBoxes);
    notifyDataChange(newBoxes, connections);
  };

  // Delete box
  const deleteBox = (id: string) => {
    const newBoxes = boxes.filter(box => box.id !== id);
    const newConnections = connections.filter(conn => conn.from !== id && conn.to !== id);
    setBoxes(newBoxes);
    setConnections(newConnections);
    notifyDataChange(newBoxes, newConnections);
  };

  // Remove all connections
  const removeAllConnections = () => {
    setConnections([]);
    notifyDataChange(boxes, []);
  };

  // Remove connections from a specific box and side
  const removeConnectionsFromPoint = (boxId: string, side: "top" | "bottom") => {
    const newConnections = connections.filter(
      conn => !(conn.from === boxId && conn.fromSide === side) && 
              !(conn.to === boxId && conn.toSide === side)
    );
    setConnections(newConnections);
    notifyDataChange(boxes, newConnections);
  };


  // Import JSON
  const handleImportClick = () => fileInputRef.current?.click();
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const parsed = JSON.parse(result);

        if (parsed.boxes && parsed.connections) {
          setBoxes(parsed.boxes);
          setConnections(parsed.connections);
          notifyDataChange(parsed.boxes, parsed.connections);
        } else {
          alert("Invalid file format");
        }
      } catch {
        alert("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
  };

  // Get attachment coordinates
  const getAttachmentPoint = (
    box: Box,
    side: "top" | "bottom"
  ): { x: number; y: number } => {
    const width = 320;
    const height = 160; // Updated height to match new box size
    return {
      x: box.x + width / 2,
      y: side === "top" ? box.y : box.y + height,
    };
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundImage: 'url(/mquest_bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Toolbar actions */}
      <div className="absolute top-5 right-45 flex gap-3 z-10">
        <button
          onClick={removeAllConnections}
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
        >
          Remove All Arrows
        </button>
        <button
          onClick={handleImportClick}
          className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
        >
          Import
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="application/json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {connections.map((conn, idx) => {
          const fromBox = boxes.find((b) => b.id === conn.from);
          const toBox = boxes.find((b) => b.id === conn.to);
          if (!fromBox || !toBox) return null;

          const from = getAttachmentPoint(fromBox, conn.fromSide);
          const to = getAttachmentPoint(toBox, conn.toSide);

          return (
            <line
              key={idx}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="black"
              strokeWidth={2}
            />
          );
        })}
      </svg>

      {/* Boxes */}
      {boxes.map((box) => (
        <div
          key={box.id}
          className="box absolute rounded-xl shadow-md border border-gray-200 p-4 w-80 h-40 group text-black"
          style={{ 
            left: box.x, 
            top: box.y,
            backgroundColor: 'tan'
          }}
          onMouseDown={(e) => {
            // Only drag if not clicking on an attachment point or delete button
            const target = e.target as HTMLElement;
            if (!target.classList.contains("attachment-point") && 
                !target.classList.contains("delete-btn")) {
              handleMouseDown(e, box.id);
            }
          }}
        >
          {/* Delete button */}
          <button
            className="delete-btn absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => deleteBox(box.id)}
          >
            ×
          </button>

          <input
            type="text"
            className="w-full text-sm font-semibold focus:outline-none bg-transparent mb-1"
            placeholder="Location Title"
            value={box.title}
            onChange={(e) => updateBox(box.id, 'title', e.target.value)}
          />
          <input
            type="text"
            className="w-full text-xs text-gray-700 focus:outline-none bg-gray-50 rounded p-1 mb-1"
            placeholder="Address or location..."
            value={box.address}
            onChange={(e) => updateBox(box.id, 'address', e.target.value)}
          />
          <textarea
            className="w-full text-xs text-gray-700 rounded p-1 resize-none focus:outline-none bg-gray-50"
            placeholder="Add description, notes, or details..."
            rows={2}
            value={box.description}
            onChange={(e) => updateBox(box.id, 'description', e.target.value)}
          />

          {/* Attachment points */}
          <div
            className="attachment-point absolute left-1/2 -top-2 w-3 h-3 bg-blue-500 rounded-full cursor-crosshair transform -translate-x-1/2 hover:bg-blue-600"
            onMouseDown={(e) => {
              e.preventDefault();
              startConnection(box.id, "top");
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              finishConnection(box.id, "top");
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              removeConnectionsFromPoint(box.id, "top");
            }}
            title="Click to connect, double-click to remove connections"
          />
          <div
            className="attachment-point absolute left-1/2 -bottom-2 w-3 h-3 bg-blue-500 rounded-full cursor-crosshair transform -translate-x-1/2 hover:bg-blue-600"
            onMouseDown={(e) => {
              e.preventDefault();
              startConnection(box.id, "bottom");
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              finishConnection(box.id, "bottom");
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              removeConnectionsFromPoint(box.id, "bottom");
            }}
            title="Click to connect, double-click to remove connections"
          />
        </div>
      ))}
    </div>
  );
}
