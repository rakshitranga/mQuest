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
  duration?: string; // travel time (e.g., "15 mins", "2 hours")
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
  const [showGasStationModal, setShowGasStationModal] = useState(false);
  const [gasStationModalData, setGasStationModalData] = useState<{
    connection: Connection;
    dropX: number;
    dropY: number;
  } | null>(null);

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

  // Fetch travel time between two locations
  const fetchTravelTime = async (fromAddress: string, toAddress: string): Promise<string> => {
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Get driving directions and travel time from "${fromAddress}" to "${toAddress}". Only return the travel time duration (e.g., "15 mins", "1 hour 30 mins").`,
          system: `You are a travel time calculator. Use Google Maps services to get the driving time between two locations. Return ONLY the travel duration in a simple format like "15 mins", "1 hour 30 mins", or "2 hours". Do not include any other text or explanations.`
        }),
      });

      const data = await response.json();
      if (data.ok && data.text) {
        // Extract just the time duration from the response
        const timeMatch = data.text.match(/(\d+\s*(?:hour|hr|h)?\s*\d*\s*(?:minute|min|m)?s?)/i);
        return timeMatch ? timeMatch[0] : 'Unknown';
      }
      return 'Unknown';
    } catch (error) {
      console.error('Error fetching travel time:', error);
      return 'Unknown';
    }
  };

  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Notify parent of data changes
  const notifyDataChange = useCallback((newBoxes: Box[], newConnections: Connection[]) => {
    if (onDataChange) {
      onDataChange({ boxes: newBoxes, connections: newConnections });
    }
  }, [onDataChange]);

  // Add box when dropped
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    
    if (type === "box") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newBox = {
        id: `box-${Date.now()}`,
        x,
        y,
        title: "New Location",
        description: "Add description here...",
        address: ""
      };

      const newBoxes = [...boxes, newBox];
      setBoxes(newBoxes);
      notifyDataChange(newBoxes, connections);
    } else if (type === "gas-station") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;

      // Find the connection line closest to the drop point
      let closestConnection = null;
      let minDistance = Infinity;

      for (const conn of connections) {
        const fromBox = boxes.find(b => b.id === conn.from);
        const toBox = boxes.find(b => b.id === conn.to);
        if (!fromBox || !toBox) continue;

        const from = getAttachmentPoint(fromBox, conn.fromSide);
        const to = getAttachmentPoint(toBox, conn.toSide);

        // Calculate distance from drop point to line
        const distance = distanceToLine(dropX, dropY, from.x, from.y, to.x, to.y);
        if (distance < minDistance && distance < 20) { // Within 20px of line
          minDistance = distance;
          closestConnection = conn;
        }
      }

      if (closestConnection) {
        await handleGasStationDrop(closestConnection, dropX, dropY);
      }
    } else if (type === "landmark") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;

      // Find the connection line closest to the drop point
      let closestConnection = null;
      let minDistance = Infinity;

      for (const conn of connections) {
        const fromBox = boxes.find(b => b.id === conn.from);
        const toBox = boxes.find(b => b.id === conn.to);
        if (!fromBox || !toBox) continue;

        const from = getAttachmentPoint(fromBox, conn.fromSide);
        const to = getAttachmentPoint(toBox, conn.toSide);

        // Calculate distance from drop point to line
        const distance = distanceToLine(dropX, dropY, from.x, from.y, to.x, to.y);
        if (distance < minDistance && distance < 20) { // Within 20px of line
          minDistance = distance;
          closestConnection = conn;
        }
      }

      if (closestConnection) {
        await handleLandmarkDrop(closestConnection, dropX, dropY);
      }
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

  // Utility function to calculate distance from point to line
  const distanceToLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle gas station drop on connection line
  const handleGasStationDrop = async (connection: Connection, dropX: number, dropY: number) => {
    const fromBox = boxes.find(b => b.id === connection.from);
    const toBox = boxes.find(b => b.id === connection.to);
    
    if (!fromBox || !toBox || !fromBox.address || !toBox.address) return;

    // Show modal for position selection
    setGasStationModalData({ connection, dropX, dropY });
    setShowGasStationModal(true);
  };

  // Handle gas station position selection from modal
  const handleGasStationPositionSelect = async (selectedOption: string) => {
    if (!gasStationModalData) return;
    
    const { connection, dropX, dropY } = gasStationModalData;
    const fromBox = boxes.find(b => b.id === connection.from);
    const toBox = boxes.find(b => b.id === connection.to);
    
    if (!fromBox || !toBox || !fromBox.address || !toBox.address) return;

    setShowGasStationModal(false);
    setGasStationModalData(null);

    const positionMap = {
      "1": { text: "1/4 of the way", fraction: 0.25 },
      "2": { text: "halfway", fraction: 0.5 },
      "3": { text: "3/4 of the way", fraction: 0.75 }
    };

    const selectedPosition = positionMap[selectedOption as keyof typeof positionMap];

    try {
      // Find gas station at the specified position along the route
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Find a gas station ${selectedPosition.text} along the route from "${fromBox.address}" to "${toBox.address}". Return only the gas station name and complete address in this exact format: "Name: [Gas Station Name]\nAddress: [Complete Address]"`,
          system: `You are a gas station finder. Use Google Maps services to find a gas station along the route between two locations making sure it is positioned ${selectedPosition.text} along the journey and is the most efficient option without adding too much time. Return ONLY the gas station name and address in the specified format. Choose a well-known gas station chain if possible.`
        }),
      });

      const data = await response.json();
      
      if (data.ok && data.text) {
        // Parse the response to extract name and address
        const nameMatch = data.text.match(/Name:\s*(.+)/i);
        const addressMatch = data.text.match(/Address:\s*(.+)/i);
        
        const gasStationName = nameMatch ? nameMatch[1].trim() : 'Gas Station';
        const gasStationAddress = addressMatch ? addressMatch[1].trim() : 'Address not found';

        // Calculate position along the route based on user selection
        const fromPoint = getAttachmentPoint(fromBox, connection.fromSide);
        const toPoint = getAttachmentPoint(toBox, connection.toSide);
        
        const gasStationX = fromPoint.x + (toPoint.x - fromPoint.x) * selectedPosition.fraction - 96; // Center the smaller box (192/2 = 96)
        const gasStationY = fromPoint.y + (toPoint.y - fromPoint.y) * selectedPosition.fraction - 48; // Center the smaller box (96/2 = 48)

        // Create a smaller gas station box
        const gasStationBox = {
          id: `gas-station-${Date.now()}`,
          x: gasStationX,
          y: gasStationY,
          title: gasStationName,
          description: `Gas Station (${selectedPosition.text})`,
          address: gasStationAddress
        };

        // Remove the original connection
        const newConnections = connections.filter(conn => conn !== connection);

        // Add connections: from -> gas station -> to
        const connectionToGas = {
          from: connection.from,
          fromSide: connection.fromSide,
          to: gasStationBox.id,
          toSide: "top" as const,
          duration: 'Calculating...'
        };

        const connectionFromGas = {
          from: gasStationBox.id,
          fromSide: "bottom" as const,
          to: connection.to,
          toSide: connection.toSide,
          duration: 'Calculating...'
        };

        const updatedConnections = [...newConnections, connectionToGas, connectionFromGas];
        const updatedBoxes = [...boxes, gasStationBox];

        setBoxes(updatedBoxes);
        setConnections(updatedConnections);
        notifyDataChange(updatedBoxes, updatedConnections);

        // Calculate travel times for the new connections
        if (fromBox.address && gasStationAddress) {
          const travelTime1 = await fetchTravelTime(fromBox.address, gasStationAddress);
          const travelTime2 = await fetchTravelTime(gasStationAddress, toBox.address);

          const finalConnections = updatedConnections.map(conn => {
            if (conn.from === connection.from && conn.to === gasStationBox.id) {
              return { ...conn, duration: travelTime1 };
            } else if (conn.from === gasStationBox.id && conn.to === connection.to) {
              return { ...conn, duration: travelTime2 };
            }
            return conn;
          });

          setConnections(finalConnections);
          notifyDataChange(updatedBoxes, finalConnections);
        }
      }
    } catch (error) {
      console.error('Error finding gas station:', error);
    }
  };

  // Handle landmark drop on connection line
  const handleLandmarkDrop = async (connection: Connection, dropX: number, dropY: number) => {
    const fromBox = boxes.find(b => b.id === connection.from);
    const toBox = boxes.find(b => b.id === connection.to);
    
    if (!fromBox || !toBox || !fromBox.address || !toBox.address) return;

    try {
      // Find a fun landmark between the two locations using Gemini
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Find a fun, interesting landmark or tourist attraction along the route from "${fromBox.address}" to "${toBox.address}". Return only the landmark name and complete address in this exact format: "Name: [Landmark Name]\nAddress: [Complete Address]"`,
          system: `You are a fun landmark finder. Use Google Maps services to find an interesting tourist attraction, landmark, or point of interest along the route between two locations. Choose something fun, unique, or historically significant that travelers would enjoy visiting. Return ONLY the landmark name and address in the specified format.`
        }),
      });

      const data = await response.json();
      
      if (data.ok && data.text) {
        // Parse the response to extract name and address
        const nameMatch = data.text.match(/Name:\s*(.+)/i);
        const addressMatch = data.text.match(/Address:\s*(.+)/i);
        
        const landmarkName = nameMatch ? nameMatch[1].trim() : 'Landmark';
        const landmarkAddress = addressMatch ? addressMatch[1].trim() : 'Address not found';

        // Calculate position halfway along the route
        const fromPoint = getAttachmentPoint(fromBox, connection.fromSide);
        const toPoint = getAttachmentPoint(toBox, connection.toSide);
        
        const landmarkX = fromPoint.x + (toPoint.x - fromPoint.x) * 0.5 - 96; // Center the smaller box (192/2 = 96)
        const landmarkY = fromPoint.y + (toPoint.y - fromPoint.y) * 0.5 - 48; // Center the smaller box (96/2 = 48)

        // Create a landmark box (same size as gas station)
        const landmarkBox = {
          id: `landmark-${Date.now()}`,
          x: landmarkX,
          y: landmarkY,
          title: landmarkName,
          description: 'Fun Landmark',
          address: landmarkAddress
        };

        // Remove the original connection
        const newConnections = connections.filter(conn => conn !== connection);

        // Add connections: from -> landmark -> to
        const connectionToLandmark = {
          from: connection.from,
          fromSide: connection.fromSide,
          to: landmarkBox.id,
          toSide: "top" as const,
          duration: 'Calculating...'
        };

        const connectionFromLandmark = {
          from: landmarkBox.id,
          fromSide: "bottom" as const,
          to: connection.to,
          toSide: connection.toSide,
          duration: 'Calculating...'
        };

        const updatedConnections = [...newConnections, connectionToLandmark, connectionFromLandmark];
        const updatedBoxes = [...boxes, landmarkBox];

        setBoxes(updatedBoxes);
        setConnections(updatedConnections);
        notifyDataChange(updatedBoxes, updatedConnections);

        // Calculate travel times for the new connections
        if (fromBox.address && landmarkAddress) {
          const travelTime1 = await fetchTravelTime(fromBox.address, landmarkAddress);
          const travelTime2 = await fetchTravelTime(landmarkAddress, toBox.address);

          const finalConnections = updatedConnections.map(conn => {
            if (conn.from === connection.from && conn.to === landmarkBox.id) {
              return { ...conn, duration: travelTime1 };
            } else if (conn.from === landmarkBox.id && conn.to === connection.to) {
              return { ...conn, duration: travelTime2 };
            }
            return conn;
          });

          setConnections(finalConnections);
          notifyDataChange(updatedBoxes, finalConnections);
        }
      }
    } catch (error) {
      console.error('Error finding landmark:', error);
    }
  };

  // Connections
  const startConnection = (boxId: string, side: "top" | "bottom") => {
    setConnectingFrom({ boxId, side });
  };

  const finishConnection = async (boxId: string, side: "top" | "bottom") => {
    if (connectingFrom && connectingFrom.boxId !== boxId) {
      const fromBox = boxes.find(b => b.id === connectingFrom.boxId);
      const toBox = boxes.find(b => b.id === boxId);
      
      // Check if this connection already exists (to avoid duplicates)
      const existingConnection = connections.find(conn => 
        (conn.from === connectingFrom.boxId && conn.to === boxId) ||
        (conn.from === boxId && conn.to === connectingFrom.boxId)
      );

      if (existingConnection) {
        setConnectingFrom(null);
        return; // Don't create duplicate connections
      }
      
      const newConnection = {
        from: connectingFrom.boxId,
        fromSide: connectingFrom.side,
        to: boxId,
        toSide: side,
        duration: 'Calculating...'
      };

      const newConnections = [...connections, newConnection];
      setConnections(newConnections);
      notifyDataChange(boxes, newConnections);

      // Fetch travel time asynchronously only if both addresses exist
      if (fromBox && toBox && fromBox.address && toBox.address && 
          fromBox.address.trim() !== '' && toBox.address.trim() !== '') {
        const travelTime = await fetchTravelTime(fromBox.address, toBox.address);
        
        // Update the connection with the actual travel time
        const updatedConnections = newConnections.map(conn => 
          conn === newConnection ? { ...conn, duration: travelTime } : conn
        );
        setConnections(updatedConnections);
        notifyDataChange(boxes, updatedConnections);
      } else {
        // If no valid addresses, remove the "Calculating..." text
        const updatedConnections = newConnections.map(conn => 
          conn === newConnection ? { ...conn, duration: undefined } : conn
        );
        setConnections(updatedConnections);
        notifyDataChange(boxes, updatedConnections);
      }
    }
    setConnectingFrom(null);
  };

  // Update box content
  const updateBox = async (id: string, field: 'title' | 'description' | 'address', value: string) => {
    const newBoxes = boxes.map((box) =>
      box.id === id ? { ...box, [field]: value } : box
    );
    setBoxes(newBoxes);
    notifyDataChange(newBoxes, connections);

    // If address was updated, recalculate travel times for connections without duration
    if (field === 'address' && value.trim() !== '') {
      const connectionsToUpdate = connections.filter(conn => 
        (conn.from === id || conn.to === id) && (!conn.duration || conn.duration === 'Unknown')
      );

      for (const conn of connectionsToUpdate) {
        const fromBox = newBoxes.find(b => b.id === conn.from);
        const toBox = newBoxes.find(b => b.id === conn.to);
        
        if (fromBox && toBox && fromBox.address && toBox.address && 
            fromBox.address.trim() !== '' && toBox.address.trim() !== '') {
          
          // Update connection to show "Calculating..."
          const tempConnections = connections.map(c => 
            c === conn ? { ...c, duration: 'Calculating...' } : c
          );
          setConnections(tempConnections);
          
          const travelTime = await fetchTravelTime(fromBox.address, toBox.address);
          
          // Update with actual travel time
          const finalConnections = tempConnections.map(c => 
            c.from === conn.from && c.to === conn.to ? { ...c, duration: travelTime } : c
          );
          setConnections(finalConnections);
          notifyDataChange(newBoxes, finalConnections);
        }
      }
    }
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



  // Get attachment coordinates
  const getAttachmentPoint = (
    box: Box,
    side: "top" | "bottom"
  ): { x: number; y: number } => {
    const isGasStation = box.id.startsWith('gas-station-');
    const isLandmark = box.id.startsWith('landmark-');
    const isSmallBox = isGasStation || isLandmark;
    
    const width = isSmallBox ? 192 : 320;  // 48 * 4 = 192px for small boxes, 80 * 4 = 320px for regular
    const height = isSmallBox ? 96 : 160;  // 24 * 4 = 96px for small boxes, 40 * 4 = 160px for regular
    
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

      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {connections.map((conn, idx) => {
          const fromBox = boxes.find((b) => b.id === conn.from);
          const toBox = boxes.find((b) => b.id === conn.to);
          if (!fromBox || !toBox) return null;

          const from = getAttachmentPoint(fromBox, conn.fromSide);
          const to = getAttachmentPoint(toBox, conn.toSide);

          // Calculate midpoint for text placement
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;

          return (
            <g key={idx}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="black"
                strokeWidth={2}
              />
              {conn.duration && conn.duration !== 'Unknown' && (
                <>
                  {/* Background rectangle for text */}
                  <rect
                    x={midX - 25}
                    y={midY - 10}
                    width={50}
                    height={20}
                    fill="white"
                    stroke="#d1d5db"
                    strokeWidth={1}
                    rx={4}
                  />
                  {/* Travel time text */}
                  <text
                    x={midX}
                    y={midY + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#374151"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {conn.duration}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Boxes */}
      {boxes.map((box) => {
        const isGasStation = box.id.startsWith('gas-station-');
        const isLandmark = box.id.startsWith('landmark-');
        const isSmallBox = isGasStation || isLandmark;
        
        return (
        <div
          key={box.id}
          className={`box absolute rounded-xl shadow-md border-4 group text-black ${
            isSmallBox 
              ? `w-48 h-24 p-2 ${isGasStation ? 'border-blue-600' : 'border-purple-600'}` 
              : 'border-amber-600 w-80 h-40 p-4'
          }`}
          style={{ 
            left: box.x, 
            top: box.y,
            backgroundColor: isGasStation ? '#e0f2fe' : isLandmark ? '#faf5ff' : 'tan'
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

          {isSmallBox ? (
            /* Small Box Content - Compact Layout for Gas Stations and Landmarks */
            <div className="h-full overflow-y-auto">
              <input
                type="text"
                className="w-full text-xs font-semibold focus:outline-none bg-transparent mb-1"
                placeholder={isGasStation ? "Gas Station Name" : "Landmark Name"}
                value={box.title}
                onChange={(e) => updateBox(box.id, 'title', e.target.value)}
              />
              <input
                type="text"
                className="w-full text-xs text-gray-700 focus:outline-none bg-transparent rounded p-1"
                placeholder="Address..."
                value={box.address}
                onChange={(e) => updateBox(box.id, 'address', e.target.value)}
              />
            </div>
          ) : (
            /* Regular Box Content - Full Layout */
            <>
              <input
                type="text"
                className="w-full text-sm font-semibold focus:outline-none bg-transparent mb-1"
                placeholder="Location Title"
                value={box.title}
                onChange={(e) => updateBox(box.id, 'title', e.target.value)}
              />
              <input
                type="text"
                className="w-full text-xs text-gray-700 focus:outline-none bg-transparent rounded p-1 mb-1"
                placeholder="Address or location..."
                value={box.address}
                onChange={(e) => updateBox(box.id, 'address', e.target.value)}
              />
              <textarea
                className="w-full text-xs text-gray-700 rounded p-1 resize-none focus:outline-none bg-transparent"
                placeholder="Add description, notes, or details..."
                rows={2}
                value={box.description}
                onChange={(e) => updateBox(box.id, 'description', e.target.value)}
              />
            </>
          )}

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
        );
      })}

      {/* Gas Station Position Modal */}
      {showGasStationModal && gasStationModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0"
            onClick={() => {
              setShowGasStationModal(false);
              setGasStationModalData(null);
            }}
          />
          
          {/* Modal */}
          <div className="relative bg-white text-black rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Gas Station</h3>
              <button
                onClick={() => {
                  setShowGasStationModal(false);
                  setGasStationModalData(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Where would you like to stop for gas along the route?
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleGasStationPositionSelect("1")}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">1/4 of the way</div>
                  <div className="text-sm text-gray-500">Early in the trip</div>
                </button>
                
                <button
                  onClick={() => handleGasStationPositionSelect("2")}
                  className="w-full p-3 text-left border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="font-medium text-blue-900">Halfway</div>
                  <div className="text-sm text-blue-600">Middle of the trip (Recommended)</div>
                </button>
                
                <button
                  onClick={() => handleGasStationPositionSelect("3")}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">3/4 of the way</div>
                  <div className="text-sm text-gray-500">Later in the trip</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
