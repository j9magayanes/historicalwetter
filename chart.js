function tempChart({ element, data }) {
    let noScrollWidth,
      scrollWidth,
      delaunay,
      tooltipDatumIndex,
      groupedData,
      flattenedData,
      pointsData,
      totalDays;
  
    // Chart dimensions and style constants
    const height = 200;
    const focusDotSize = 4;
    const lineStrokeWidth = 2;
    const dayDotSize = 2;
    const dayDotsOffset = 8;
    const dayLabelsHeight = 20;
    const dayLabelsOffset = dayDotsOffset * 2 + dayLabelsHeight / 2;
    const monthLabelsHeight = 24;
    const monthLabelsOffset =
      dayLabelsOffset + dayLabelsHeight / 2 + monthLabelsHeight / 2;
    const marginTop = 20;
    const marginRight = 20;
    const marginBottom = monthLabelsOffset + monthLabelsHeight / 2;
    const marginLeft = focusDotSize;
    const thresholds = [400, 640];
  
    // Accessor functions for data
    const xAccessor = (d) => d.date;
    const y1Accessor = (d) =>
      Number.isFinite(d.maxMaxThisYear) ? d.maxMaxThisYear : undefined;
    const y2Accessor = (d) => (Number.isFinite(d.maxMax) ? d.maxMax : undefined);
    const y0Accessor = (d) => (Number.isFinite(d.minMin) ? d.minMin : undefined);
    const y3Accessor = (d) => (Number.isFinite(d.avgMax) ? d.avgMax : undefined);
    const y4Accessor = (d) => (Number.isFinite(d.avgMin) ? d.avgMin : undefined);
  
  
  
    // Formatting values for tooltip
    const valueFormat = new Intl.NumberFormat('de-DE', {
      maximumFractionDigits: 1,
    }).format;
  
    // Formatting year for tooltip
    const yearFormat = (dateString) => {
      const date = new Date(dateString);
      return date.getUTCFullYear();
    }
  
    // Month names for labels
    const monthNames = [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
    ];
  
    // Scales for the chart
    const x = d3.scaleUtc();
    const y = d3.scaleLinear().range([height - marginBottom, marginTop]);
  
    // Area and line generators
    const areaGenerator = d3
      .area()
      .x((d) => x(d[0]))
      .y0(height - marginBottom)
      .y1((d) => y(d[1]))
      .curve(d3.curveMonotoneX)
      .defined((d) => d[1] !== undefined);
    const lineGenerator = areaGenerator.lineY1();
  
        // Clear any existing elements in the container
  
  
    // Create the main container
    const container = d3.select(element).attr("class", "temp-chart");
    const chartContainer = container
      .append("div")
      .attr("class", "chart-container");
    const scrollContainer = chartContainer
      .append("div")
      .attr("class", "scroll-container")
      .on("scroll", mouseleft, { passive: true });
    const svg = scrollContainer
      .append("svg")
      .attr("class", "main-svg")
      .on("mouseenter", mouseentered)
      .on("mousemove", mousemoved)
      .on("mouseleave", mouseleft);
    const yAxisSvg = chartContainer.append("svg").attr("class", "y-axis-svg");
    const swatchesContainer = container
      .append("div")
      .attr("class", "swatches-container");
   // renderSwatches();
  
    // Tooltip element
    const tooltip = container.append("div").attr("class", "tip");
  
    wrangle();
  
    new ResizeObserver(resized).observe(scrollContainer.node());
  
    // Process and organize data
    function wrangle() {
      ({ groupedData, flattenedData, pointsData, latestDay, displayData } = processData(data));
      totalDays = flattenedData.length;
  
      x.domain(d3.extent(flattenedData, xAccessor));
      y.domain(getYExtent()).nice();
  
    // Calculate the extent for y-axis
    function getYExtent() {
      let yMin = d3.min(flattenedData, (d) =>
        d3.min([y0Accessor(d), y2Accessor(d)])
      );
      let yMax = d3.max(flattenedData, (d) =>
        d3.max([y1Accessor(d), y2Accessor(d)])
      );
      const padding = (yMax - yMin) * 0.1;
      // Ensure the minimum y value does not exceed -10
      yMin = Math.min(yMin - padding, -20
      );
      yMax += padding;
      return [yMin, yMax];
    }
      if (!!noScrollWidth) resized();
    }
  
    // Resize handler
    function resized() {
      noScrollWidth = scrollContainer.node().clientWidth;
      const boundedWidth =
        scrollContainer.node().clientWidth -
        marginRight -
        dayLabelsHeight / 2 +
        marginLeft;
      const months = d3.bisect(thresholds, boundedWidth) + 1;
      const days = d3.sum(groupedData.slice(-months), (d) => d.days.length);
      scrollWidth =
        (boundedWidth / (days - 1)) * (totalDays - 1) + marginLeft + marginRight;
  
      x.range([marginLeft, scrollWidth - marginRight]);
  
      // Create Delaunay triangulation for interaction
      delaunay = d3.Delaunay.from(
        pointsData,
        (d) => x(d[0]),
        (d) => y(d[1])
      );
  
      // Set dimensions for y-axis and main SVG
      yAxisSvg.attr("width", noScrollWidth).attr("height", height);
      svg.attr("width", scrollWidth).attr("height", height);
  
      // Render the chart
      renderChart();
  
      scrollContainer.node().scrollLeft = scrollContainer.node().scrollWidth;
    }
  
    // Main render function
    function renderChart() {
      renderYAxis();
      renderSeries();
      renderXAxis();
      renderFocus();
      renderButtons();
      renderPoints();
      renderTooltip();
    }
  
   // Render y-axis grid
    function renderYAxis() {
      const g = yAxisSvg
        .selectAll('.y-axis-g')
        .data([0])
        .join((enter) => enter.append('g').attr('class', 'y-axis-g'))
        .attr('transform', `translate(${noScrollWidth - marginRight},0)`);
  
      g.selectAll('.bg-rect')
        .data([0])
        .join((enter) =>
          enter
            .append('rect')
            .attr('class', 'bg-rect')
            .attr('height', height)
            .attr('x', dayDotSize)
            .attr('width', marginRight - dayDotSize)
        );
  
      const ticks = y.ticks((height - marginTop - marginBottom) / 30);
  
      g.selectAll('.tick')
        .data(ticks)
        .join((enter) =>
          enter
            .append('g')
            .attr('class', 'tick')
            .call((g) => g.append('line').attr('stroke', '#B6B5B5'))
            .call((g) =>
              g
                .append('text')
                .attr('x', marginRight)
                .attr('dy', '0.32em')
                .attr('text-anchor', 'end')
                .attr('fill', '#B6B5B5')
            )
        )
        .attr('transform', (d) => `translate(0,${y(d)})`)
        .call((g) =>
          g.select('line').attr('x1', -(noScrollWidth - marginLeft - marginRight))
        )
        .call((g) => g.select('text').text((d) => d.toLocaleString()));
    }
  
    // Render series data (area and lines)
    function renderSeries() {
      const areaGenerator = d3
      .area()
      .x((d) => x(d[0]))
      .y0((d) => y(d[1])) 
      .y1((d) => y(d[2])); 
  
    svg
      .selectAll('.area-path-2')
      .data([
        flattenedData.map((d) => [xAccessor(d), y3Accessor(d), y4Accessor(d)]),
      ])
      .join((enter) =>
        enter
          .append('path')
          .attr('class', 'area-path-2')
          .attr('fill', 'var(--clr-fill-series-2)')
      )
      .attr('d', areaGenerator); 
  //avg max
      svg
        .selectAll('.line-path-6')
        .data([flattenedData.map((d) => [xAccessor(d), y3Accessor(d)])])
        .join((enter) =>
          enter
            .append('path')
            .attr('class', 'line-path-6')
            .attr('fill', 'none')
            .attr('stroke', 'var(--clr-series-2)')
            .attr('stroke-width', '2')
        )
        .attr('d', lineGenerator);
  
  //maxmax this year
      svg
        .selectAll('.line-path-1')
        .data([flattenedData.map((d) => [xAccessor(d), y1Accessor(d)])])
        .join((enter) =>
          enter
            .append('path')
            .attr('class', 'line-path-1')
            .attr('fill', 'none')
            .attr('stroke', 'var(--clr-series-1)')
            .attr('stroke-width', lineStrokeWidth)
        )
        .attr('d', lineGenerator);
  //maxmax
      svg
        .selectAll('.line-path-4')
        .data([flattenedData.map((d) => [xAccessor(d), y2Accessor(d)])])
        .join(
          (enter) =>
            enter
              .append('path')
              .attr('class', 'line-path-4')
              .attr('fill', 'none')
              .attr('stroke', '#174482') 
              .attr('stroke-width', lineStrokeWidth)
              .attr('stroke-dasharray', '2  3') 
        )
        .attr('d', lineGenerator);
  //minmin
      svg
        .selectAll('.line-path-5')
        .data([flattenedData.map((d) => [xAccessor(d), y0Accessor(d)])])
        .join(
          (enter) =>
            enter
              .append('path')
              .attr('class', 'line-path-4')
              .attr('fill', 'none')
              .attr('stroke', '#174482') 
              .attr('stroke-width', lineStrokeWidth)
              .attr('stroke-dasharray', '2 3')
        )
        .attr('d', lineGenerator);
      
    }
  
  
  // Render Buttons
  function renderButtons() {
    const container = d3.select(element).attr('class', 'temp-chart');
  
    // Ensure buttons are appended only once
    container.selectAll('.scroll-left, .scroll-right').remove();
    container.append('button')
      .attr('class', 'scroll-left')
      .style('position', 'absolute')
      .style('left', '-27px')
      .style('bottom', '34px')
      .attr('transform', `translate(0,${height - marginBottom})`)  
      .on('click', () => {
        scrollContainer.node().scrollBy({ left: -scrollContainer.node().offsetWidth / 2, behavior: 'smooth' });
      })
      .append('svg')
        .attr('width', '24')
        .attr('class', 'arrow-svg-left')
        .attr('height', '24')
        .append('image')
          .attr('href', './assets/left_arrow.svg') 
  
    container.append('button')
      .attr('class', 'scroll-right')
      .style('position', 'absolute')
      .style('right', '-8px')
      .style('bottom', '34px')
  
      .on('click', () => {
        scrollContainer.node().scrollBy({ left: scrollContainer.node().offsetWidth / 2, behavior: 'smooth' });
      })
      .append('svg')
      .attr('width', '24')
      .attr('height', '24')
      .attr('class', 'arrow-svg-right')
      .append('image')
        .attr('href', './assets/right_arrow.svg')
    }
  
  
    // Render x-axis
    function renderXAxis() {
      const g = svg
        .selectAll(".x-axis-g")
        .data([0])
        .join((enter) => enter.append("g").attr("class", "x-axis-g"))
        .attr("transform", `translate(0,${height - marginBottom})`);
  
      g.selectAll(".day-dots-g")
        .data([0])
        .join((enter) =>
          enter
            .append("g")
            .attr("class", "day-dots-g")
            .attr("transform", `translate(0,${dayDotsOffset})`)
        )
        .selectAll(".day-dot-circle")
        .data(flattenedData)
        .join((enter) =>
          enter
            .append("circle")
            .attr("class", "day-dot-circle")
            .attr("r", dayDotSize)
        )
        .attr("cx", (d) => x(xAccessor(d)));
  
      const dayLabelsG = g
        .selectAll(".day-labels-g")
        .data([0])
        .join((enter) =>
          enter
            .append("g")
            .attr("class", "day-labels-g")
            .attr("transform", `translate(0,${dayLabelsOffset})`)
            .call((g) => g.append("g").attr("class", "day-labels-lines-g"))
            .call((g) => g.append("g").attr("class", "day-labels-texts-g"))
        );
      dayLabelsG
        .select(".day-labels-lines-g")
        .selectAll(".day-labels-line")
        .data(groupedData, (d) => d.month)
        .join((enter) =>
          enter
            .append("line")
            .attr("class", "day-labels-line")
            .attr("stroke-width", dayLabelsHeight)
        )
        .attr("x1", (d, i) => {
          const isFirstMonth = i === 0;
          return (
            x(d3.utcHour.offset(xAccessor(d.days[0]), isFirstMonth ? 0 : -12)) +
            dayLabelsHeight / 2 +
            1
          );
        })
        .attr("x2", (d, i, n) => {
          const isLastMonth = i === n.length - 1;
          return (
            x(
              d3.utcHour.offset(
                xAccessor(d.days[d.days.length - 1]),
                isLastMonth ? 0 : 12
              )
            ) -
            dayLabelsHeight / 2 -
            1
          );
        });
      dayLabelsG
        .select(".day-labels-texts-g")
        .selectAll(".day-label-month-g")
        .data(groupedData, (d) => d.month)
        .join((enter) => enter.append("g").attr("class", "day-label-month-g"))
        .selectAll(".day-label-text")
        .data(
          (d) => d.days.filter((d) => [5, 10, 15, 20, 25].includes(d.day)),
          (d) => d.day
        )
        .join((enter) =>
          enter
            .append("text")
            .attr("class", "day-label-text")
            .attr("fill", "currentColor")
            .attr("text-anchor", "middle")
            .attr("dy", "0.4em")
            .text((d) => d.day)
        )
        .attr("x", (d) => x(xAccessor(d)));
  
      g.selectAll(".month-labels-g")
        .data([0])
        .join((enter) =>
          enter
            .append("g")
            .attr("class", "month-labels-g")
            .attr("transform", `translate(0,${monthLabelsOffset})`)
        )
        .selectAll(".month-label-text")
        .data(groupedData, (d) => d.month)
        .join((enter) =>
          enter
            .append("text")
            .attr("class", "month-label-text")
            .attr("fill", "currentColor")
            .attr("text-anchor", "middle")
            .attr("dy", "0.32em")
            .text((d) => monthNames[d.month - 1])
        )
        .attr("x", (d) =>
          d3.mean([d.days[0], d.days[d.days.length - 1]], (d) => x(xAccessor(d)))
        );
    }
  
    // Render color swatches for legend
    function renderSwatches() {
      swatchesContainer
        .selectAll(".swatch")
        .data(["30 Tage 2023/24", "30 Tage 1973-2022"])
        .join((enter) =>
          enter
            .append("div")
            .attr("class", "swatch")
            .call((div) =>
              div
                .append("div")
                .attr("class", "swatch-swatch")
                .style("background-color", (_, i) => `var(--clr-series-${i + 1})`)
            )
            .call((div) =>
              div
                .append("div")
                .attr("class", "swatch-label")
                .text((d) => d)
            )
        );
    }
  
    // Render points on load  
    function renderPoints() {
      // Start with today's date
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Normalize to midnight
    
      let validData = null;
    
      // Function to check if a data point has a valid `maxMaxThisYear` value
      function findValidData() {
        // Filter pointsData for the current date
        const currentData = pointsData.filter(d => {
          const dataDate = new Date(d.data.date); // Adjust based on your data structure
          dataDate.setHours(0, 0, 0, 0); // Normalize to midnight
          return dataDate.getTime() === currentDate.getTime(); // Match the current date
        });
    
        // Check if any of the data points have a valid `maxMaxThisYear` value
        validData = currentData.find(
          d =>
            d.data.maxMaxThisYear !== undefined &&
            d.data.maxMaxThisYear !== null &&
            d.data.maxMaxThisYear !== "" // Ensure it's not an empty string
        );
    
        // If no valid data, step back one day and search again
        if (!validData) {
          currentDate.setDate(currentDate.getDate() - 1); // Go back one day
          findValidData(); // Recursively check previous days
        }
      }
    
      // Start searching for valid data
      findValidData();
    
      // If no valid data is found, exit early (optional safeguard)
      if (!validData) {
        console.warn('No valid data found for rendering.');
        return;
      }
    
      console.log(validData); // Debug: Log the found valid data point
    
      // Render the circle for the found valid data
      svg
        .selectAll('.point-circle')
        .data([validData]) // Use the found valid data
        .join(
          (enter) =>
            enter
              .append('circle')
              .attr('class', 'point-circle')
              .attr('r', focusDotSize)
              .style('z-index', 5)
              .attr('fill', 'white')
              .attr('transform', (d) => `translate(${x(d[0])}, ${y(d.data.maxMaxThisYear)})`),
          (update) => update,
          (exit) => exit.remove()
        );
    }
    
    // Render points on Focus /Click
    function renderFocus() {
      const focusData =
        tooltipDatumIndex === undefined ? [] : [pointsData[tooltipDatumIndex]];
      // First circle for the main data point
      yAxisSvg
        .selectAll('.focus-circle')
        .data(focusData)
        .join((enter) =>
          enter
            .append('circle')
            .attr('class', 'focus-circle')
            .attr('r', focusDotSize)
        )
        .attr('fill', (d) => `var(--clr-series-${d.seriesId})`)
        .attr(
          'transform',
          (d) =>
            `translate(${x(d[0]) - scrollContainer.node().scrollLeft}, ${y(
              d[1]
            )})`
        );
  
      // Second circle for the avgMax data point
      yAxisSvg
        .selectAll('.focus-circle-maxmax')
        .data(focusData)
        .join((enter) =>
          enter
            .append('circle')
            .attr('class', 'focus-circle-maxmax')
            .attr('r', focusDotSize)
        )
        .attr('fill', (d) => '#174482')
        .attr(
          'transform',
          (d) =>
            `translate(${x(d[0]) - scrollContainer.node().scrollLeft}, ${y(
              d.data.maxMax
            )})`
        );
      // Third circle for the avgMin data point
      yAxisSvg
        .selectAll('.focus-circle-minmin')
        .data(focusData)
        .join((enter) =>
          enter
            .append('circle')
            .attr('class', 'focus-circle-minmin')
            .attr('r', focusDotSize)
        )
        .attr('fill', (d) => '#174482')
        .attr(
          'transform',
          (d) =>
            `translate(${x(d[0]) - scrollContainer.node().scrollLeft}, ${y(
              d.data.minMin
            )})`
        );
    }
  
    // Render tooltip
    function renderTooltip() {
      if (tooltipDatumIndex === undefined) {
        tooltip.classed('is-visible', false);
        console.log("falsy")
      } else {
        const d = pointsData[tooltipDatumIndex]
        const src = `./assets/temp_${d.seriesId === 1 ? 'down' : 'up'}.svg`;
        tooltip
          .html(
            `<div class="tooltip-background">
              <div class=tooltip-row>
              <img src="./assets/temp_up_red.svg"/><span>
              ${valueFormat(
                d.data.maxMaxThisYear
              )}
            <span class="tooltip-value">${valueFormat(
                d[1]
              )}°C<span>
              </div>
              <div class=tooltip-row>
              <img src="./assets/temp_up_blue.svg"/><span>  ${
                yearFormat(d.data.maxMaxDate)
              }<span class="tooltip-value">${valueFormat(
                d.data.maxMax
              )}°C<span>
              </div>
              <div class=tooltip-row>
              <img src="./assets/temp_down.svg"/><span>${
                yearFormat(d.data.minMinDate)
              }<span class="tooltip-value">${valueFormat(
                d.data.minMin
              )}°C<span>  
              </div>
              </div>`
          )
          .classed('is-visible', true);
        const transX = x(d[0]) - scrollContainer.node().scrollLeft;
        const transXOffset = transX < noScrollWidth / 2 ? '0%' : '-100%';
        const transY = y(d[1]) - focusDotSize;
        tooltip.style(
          'transform',
          `translate(calc(${transX}px + ${transXOffset}),calc(${transY}px - 100%))`
        );
      }
    }
    
    
    function mousemoved(event) {
      const [px, py] = d3.pointer(event, svg.node());
      if (
        px < scrollContainer.node().scrollLeft ||
        px > scrollContainer.node().scrollLeft + noScrollWidth - marginRight
      )
        return mouseleft();
      const i = delaunay.find(px, py, tooltipDatumIndex);
      if (tooltipDatumIndex === i) return;
      tooltipDatumIndex = i;
      renderFocus();
      renderPoints()
      renderTooltip();
    }
  
    function mouseentered(event) {
      mousemoved(event);
    }
  
    function mouseleft() {
      tooltipDatumIndex = undefined;
      renderFocus();
      renderPoints()
      renderTooltip();
    }
  
    function processData(data) {
      const currentDate = new Date();
      const currentMonth = currentDate.getUTCMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
      const numberOfDays = Math.floor((currentDate - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
      const currentDay = currentDate.getUTCDate() - 6;
    
      // Filter data for the last three months
      const filtered = data.months.filter(
        ({ month }) => month <= currentMonth && month >= currentMonth - 3
      );
    
      // Map the filtered data to include date objects
      const groupedData = filtered.map(({ month, days }) => ({
        month,
        days: days.map((d) => ({
          ...d,
          date: new Date(Date.UTC(currentYear, month - 1, d.day)),
        })),
      }));
    
      // Flatten the days data
      const flattenedData = groupedData.flatMap(({ days }) => days);
    
      // Find the latest day in the flattenedData
      const latestDay = flattenedData.reduce((latest, current) => {
        return current.date > latest.date ? current : latest;
      }, { date: new Date(0) });
    
      const todayData = flattenedData.filter(d => d.day === currentDay);
    
      // Create arrays of pointsData containing x, y coordinates and series information
      const displayData = [
        ...todayData.map((d) => {
          const p = [xAccessor(d), y1Accessor(d)];
          p.seriesId = 1;
          p.data = d;
          return p;
        }).filter((p) => p[1] !== undefined),
        ...todayData.map((d) => {
          const p = [xAccessor(d), y2Accessor(d)];
          p.seriesId = 2;
          p.data = d;
          return p;
        }).filter((p) => p[1] !== undefined),
      ];
    
      const pointsData = [
        ...flattenedData.map((d) => {
          const p = [xAccessor(d), y1Accessor(d)];
          p.seriesId = 1;
          p.data = d;
          return p;
        }).filter((p) => p[1] !== undefined),
        ...flattenedData.map((d) => {
          const p = [xAccessor(d), y2Accessor(d)];
          p.seriesId = 2;
          p.data = d;
          return p;
        }).filter((p) => p[1] !== undefined),
      ];
    
      return { groupedData, flattenedData, pointsData, displayData, latestDay };
    }
    
    function update(_) {
      data = _;
      wrangle();
    }
  
    return {
      update,
    };
  }
  