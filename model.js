'use strict';

// Model: wireframe of a surface as two sets of polylines.
//
// Data structure:
//   uVertices - flat array [x,y,z, x,y,z, ...] holding ALL U polylines
//               (u = const, v varies), one after another,
//               pointsPerLine vertices in each polyline.
//   vVertices - the same for V polylines (v = const, u varies).
// Each set lives in its own GPU buffer. Polyline number i starts at vertex
// i * pointsPerLine and is drawn by a separate call
//   gl.drawArrays(gl.LINE_STRIP, i * pointsPerLine, pointsPerLine)
// so that neighbouring polylines are not connected to each other.
function Model(name) {
    this.name = name;
    this.iUBuffer = gl.createBuffer();
    this.iVBuffer = gl.createBuffer();
    this.uLinesCount = 0;
    this.vLinesCount = 0;
    this.pointsPerLine = 0;

    this.BufferData = function (uVertices, vVertices, pointsPerLine) {
        this.pointsPerLine = pointsPerLine;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iUBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uVertices), gl.STATIC_DRAW);
        this.uLinesCount = uVertices.length / 3 / pointsPerLine;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vVertices), gl.STATIC_DRAW);
        this.vLinesCount = vVertices.length / 3 / pointsPerLine;
    }

    this.DrawSet = function (buffer, linesCount, color) {
        gl.uniform4fv(shProgram.iColor, color);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        for (let i = 0; i < linesCount; i++) {
            gl.drawArrays(gl.LINE_STRIP, i * this.pointsPerLine, this.pointsPerLine);
        }
    }

    this.Draw = function () {
        this.DrawSet(this.iUBuffer, this.uLinesCount, [1.0, 0.3, 0.3, 1]);  // U - red
        this.DrawSet(this.iVBuffer, this.vLinesCount, [0.3, 0.7, 1.0, 1]);  // V - blue
    }
}
