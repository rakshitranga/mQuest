import { NextRequest, NextResponse } from 'next/server';
import { geminiMaps } from '@/lib/maps';

interface Box {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  address: string;
}

interface Connection {
  from: string;
  fromSide: "top" | "bottom";
  to: string;
  toSide: "top" | "bottom";
  duration?: string;
}

interface OptimizeRequest {
  boxes: Box[];
  startBoxId: string;
  endBoxId: string;
}

// Get optimized route using Gemini API with Google Maps MCP
async function getOptimizedRoute(boxes: Box[], startId: string, endId: string): Promise<{ path: string[], connections: Connection[] }> {
  try {
    const startBox = boxes.find(b => b.id === startId);
    const endBox = boxes.find(b => b.id === endId);
    
    if (!startBox || !endBox) {
      throw new Error('Start or end box not found');
    }

    // Create location list for Gemini (excluding x, y coordinates as they're irrelevant for route optimization)
    const locationList = boxes.map(box => {
      // Only include relevant data for route optimization
      const relevantData = {
        title: box.title,
        address: box.address || box.title,
        description: box.description || ''
      };
      return `"${box.id}": ${JSON.stringify(relevantData)}`;
    }).join(', ');
    
    const prompt = `I have these locations: {${locationList}}. 
    
Find the optimal driving route from "${startBox.title}" at "${startBox.address || startBox.title}" (ID: ${startId}) to "${endBox.title}" at "${endBox.address || endBox.title}" (ID: ${endId}) that visits ALL locations exactly once (Traveling Salesman Problem). 

Use Google Maps to calculate real driving times and distances between all locations using their addresses. Optimize for the shortest total travel time. Return ONLY a JSON object in this exact format:

{
  "path": ["${startId}", "box_id_2", "box_id_3", "box_id_4", "${endId}"],
  "connections": [
    {"from": "${startId}", "fromSide": "bottom", "to": "box_id_2", "toSide": "top", "duration": "15 mins"},
    {"from": "box_id_2", "fromSide": "bottom", "to": "box_id_3", "toSide": "top", "duration": "22 mins"},
    {"from": "box_id_3", "fromSide": "bottom", "to": "box_id_4", "toSide": "top", "duration": "8 mins"},
    {"from": "box_id_4", "fromSide": "bottom", "to": "${endId}", "toSide": "top", "duration": "12 mins"}
  ]
}

IMPORTANT: 
1. The path array must contain ALL ${boxes.length} location IDs, starting with "${startId}" and ending with "${endId}". 
2. Every location must be visited exactly once in the most time-efficient order.
3. Each connection MUST include a "duration" field with the actual driving time (e.g., "15 mins", "1h 30m").
4. Use Google Maps to get accurate travel times between consecutive locations in your optimized path.`;

    const system = `You are a route optimization expert with access to Google Maps services. Use the maps tools efficiently to get driving times between locations. For ${boxes.length} locations, use a greedy nearest-neighbor approach for speed: from each location, go to the nearest unvisited location. Don't calculate all possible permutations. Return valid JSON only, no explanations.`;
    
    // Add timeout for faster response
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Route optimization timeout')), 15000); // 15 second timeout
    });
    
    const response = await Promise.race([
      geminiMaps(prompt, system),
      timeoutPromise
    ]) as string;
    
    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    // Validate response structure
    if (!result.path || !result.connections || !Array.isArray(result.path) || !Array.isArray(result.connections)) {
      throw new Error('Invalid response structure');
    }
    
    // Validate that all boxes are included in the path
    if (result.path.length !== boxes.length) {
      throw new Error(`Path must include all ${boxes.length} locations, but only found ${result.path.length}`);
    }
    
    // Validate that path starts with startId and ends with endId
    if (result.path[0] !== startId || result.path[result.path.length - 1] !== endId) {
      throw new Error('Path must start with start location and end with end location');
    }
    
    // Validate that all box IDs are present
    const boxIds = new Set(boxes.map(b => b.id));
    const pathIds = new Set(result.path);
    if (boxIds.size !== pathIds.size || ![...boxIds].every(id => pathIds.has(id))) {
      throw new Error('Path must include all location IDs exactly once');
    }
    
    return result;
    
  } catch (error) {
    console.error('Error getting optimized route:', error);
    
    // Fallback: visit all boxes in order, starting with start and ending with end
    const otherBoxes = boxes.filter(b => b.id !== startId && b.id !== endId);
    const fallbackPath = [startId, ...otherBoxes.map(b => b.id), endId];
    
    const fallbackConnections: Connection[] = [];
    for (let i = 0; i < fallbackPath.length - 1; i++) {
      fallbackConnections.push({
        from: fallbackPath[i],
        fromSide: "bottom",
        to: fallbackPath[i + 1],
        toSide: "top",
        duration: "Calculating..." // Will be calculated by Canvas component
      });
    }
    
    return {
      path: fallbackPath,
      connections: fallbackConnections
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizeRequest = await request.json();
    const { boxes, startBoxId, endBoxId } = body;
    
    if (!boxes || !startBoxId || !endBoxId) {
      return NextResponse.json(
        { error: 'Missing required fields: boxes, startBoxId, endBoxId' },
        { status: 400 }
      );
    }
    
    // Validate that start and end boxes exist
    const startBox = boxes.find(b => b.id === startBoxId);
    const endBox = boxes.find(b => b.id === endBoxId);
    
    if (!startBox || !endBox) {
      return NextResponse.json(
        { error: 'Start or end box not found' },
        { status: 400 }
      );
    }
    
    // Get optimized route from Gemini
    const result = await getOptimizedRoute(boxes, startBoxId, endBoxId);
    
    return NextResponse.json({
      success: true,
      path: result.path,
      connections: result.connections,
      message: `Optimized route found with ${result.path.length} stops`
    });
    
  } catch (error) {
    console.error('Optimize API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
