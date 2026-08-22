import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface D3ResponseDashboardProps {
  totalReplies: number;
  theme?: string;
}

export default function D3ResponseDashboard({ totalReplies, theme }: D3ResponseDashboardProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous contents
    d3.select(svgRef.current).selectAll("*").remove();

    // Data based on historical stats + real-time simulation additions
    const data = [
      { day: "จันทร์ (Mon)", replied: 98, received: 110 },
      { day: "อังคาร (Tue)", replied: 115, received: 125 },
      { day: "พุธ (Wed)", replied: 130, received: 140 },
      { day: "พฤหัสฯ (Thu)", replied: 108, received: 118 },
      { day: "ศุกร์ (Fri)", replied: 142, received: 155 },
      { day: "เสาร์ (Sat)", replied: 158, received: 170 },
      { day: "อาทิตย์ (Today)", replied: totalReplies, received: Math.max(totalReplies + 12, 135) }
    ];

    // SVG Dimensions
    const width = svgRef.current.clientWidth || 400;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 30, left: 35 };

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .style("overflow", "visible");

    // Scales
    const xScale = d3.scalePoint()
      .domain(data.map(d => d.day))
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => Math.max(d.replied, d.received)) || 200])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Gridlines
    const yGrid = d3.axisLeft(yScale)
      .tickSize(-width + margin.left + margin.right)
      .tickFormat(() => "")
      .ticks(5);

    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yGrid)
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line")
        .attr("stroke", "rgba(255, 255, 255, 0.05)")
        .attr("stroke-dasharray", "3,3")
      );

    // Gradients for area
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "d3-area-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#6366f1")
      .attr("stop-opacity", 0.4);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#6366f1")
      .attr("stop-opacity", 0.0);

    // Area generator
    const area = d3.area<any>()
      .x(d => xScale(d.day)!)
      .y0(height - margin.bottom)
      .y1(d => yScale(d.replied))
      .curve(d3.curveMonotoneX);

    // Line generator
    const line = d3.line<any>()
      .x(d => xScale(d.day)!)
      .y(d => yScale(d.replied))
      .curve(d3.curveMonotoneX);

    // Line for Received (Reference)
    const lineReceived = d3.line<any>()
      .x(d => xScale(d.day)!)
      .y(d => yScale(d.received))
      .curve(d3.curveMonotoneX);

    // Append Area
    svg.append("path")
      .datum(data)
      .attr("fill", "url(#d3-area-gradient)")
      .attr("d", area);

    // Append Received Line (gray dashed)
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.25)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,4")
      .attr("d", lineReceived);

    // Append Replied Line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#6366f1")
      .attr("stroke-width", 3)
      .attr("d", line);

    // Custom Axes Styling
    const xAxis = d3.axisBottom(xScale).tickSize(0);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickSize(0);

    // Render X Axis
    svg.append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .call(g => g.select(".domain").attr("stroke", "rgba(255, 255, 255, 0.1)"))
      .call(g => g.selectAll(".tick text")
        .attr("fill", "#9ca3af")
        .style("font-size", "9px")
        .attr("dy", "10px")
      );

    // Render Y Axis
    svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis)
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick text")
        .attr("fill", "#9ca3af")
        .style("font-size", "9px")
        .attr("dx", "-4px")
      );

    // Interactive circles on data points
    const tooltipGroup = svg.append("g").style("display", "none");
    
    const tooltipBg = tooltipGroup.append("rect")
      .attr("fill", "#111115")
      .attr("stroke", "rgba(255,255,255,0.15)")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("width", 110)
      .attr("height", 45)
      .style("filter", "drop-shadow(0px 4px 6px rgba(0,0,0,0.5))");

    const tooltipText1 = tooltipGroup.append("text")
      .attr("fill", "#fff")
      .style("font-size", "9px")
      .style("font-weight", "bold")
      .attr("dx", 8)
      .attr("dy", 16);

    const tooltipText2 = tooltipGroup.append("text")
      .attr("fill", "#818cf8")
      .style("font-size", "9px")
      .style("font-weight", "bold")
      .attr("dx", 8)
      .attr("dy", 30);

    const focusGroup = svg.append("g").style("display", "none");

    focusGroup.append("circle")
      .attr("r", 5)
      .attr("fill", "#6366f1")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    focusGroup.append("circle")
      .attr("r", 1.5)
      .attr("fill", "#fff");

    // Transparent overlay for catching hover events
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mouseover", () => {
        tooltipGroup.style("display", null);
        focusGroup.style("display", null);
      })
      .on("mouseout", () => {
        tooltipGroup.style("display", "none");
        focusGroup.style("display", "none");
      })
      .on("mousemove", (event) => {
        const [mouseX] = d3.pointer(event);
        const domain = xScale.domain();
        const range = xScale.range();
        
        // Find nearest point
        let nearestIndex = 0;
        let minDiff = Infinity;
        
        domain.forEach((d, i) => {
          const xPos = xScale(d)!;
          const diff = Math.abs(xPos - mouseX);
          if (diff < minDiff) {
            minDiff = diff;
            nearestIndex = i;
          }
        });

        const nearestData = data[nearestIndex];
        const cx = xScale(nearestData.day)!;
        const cy = yScale(nearestData.replied);

        focusGroup.attr("transform", `translate(${cx}, ${cy})`);

        // Position tooltip
        let tx = cx + 10;
        let ty = cy - 25;
        if (tx + 110 > width) {
          tx = cx - 120;
        }
        if (ty < 5) {
          ty = 5;
        }

        tooltipGroup.attr("transform", `translate(${tx}, ${ty})`);
        tooltipText1.text(`${nearestData.day}`);
        tooltipText2.text(`🤖 ตอบแล้ว: ${nearestData.replied} ข้อความ`);
      });

  }, [totalReplies]);

  return (
    <div className="bg-[#16161A] border border-white/5 p-4 rounded-2xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-3 bg-indigo-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-slate-200">ประวัติการตอบกลับบอทรายวัน (D3 Interactive Chart)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-[8px] text-gray-400">บอทตอบกลับ</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-500 border border-dashed border-white/30" />
            <span className="text-[8px] text-gray-400">ผู้ใช้ส่งคำขอ</span>
          </div>
        </div>
      </div>
      <div className="w-full h-[200px] relative">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
      <p className="text-[9px] text-gray-500 text-center">💡 ลองเลื่อนเมาส์ชี้บนเส้นกราฟเพื่อดูข้อมูลการโต้ตอบแบบอินเทอร์แอคทีฟด้วย D3 Engine</p>
    </div>
  );
}
