'use strict';

// Minimal 4x4 matrix library. Matrices are 16-element arrays in column-major
// order (as WebGL expects). multiply(a, b) returns the product a * b.
const m4 = {

    identity: function () {
        return [1,0,0,0,  0,1,0,0,  0,0,1,0,  0,0,0,1];
    },

    multiply: function (a, b) {
        const r = new Array(16).fill(0);
        for (let col = 0; col < 4; col++) {
            for (let row = 0; row < 4; row++) {
                let sum = 0;
                for (let k = 0; k < 4; k++) {
                    sum += a[k * 4 + row] * b[col * 4 + k];
                }
                r[col * 4 + row] = sum;
            }
        }
        return r;
    },

    translation: function (tx, ty, tz) {
        return [1,0,0,0,  0,1,0,0,  0,0,1,0,  tx,ty,tz,1];
    },

    scaling: function (sx, sy, sz) {
        return [sx,0,0,0,  0,sy,0,0,  0,0,sz,0,  0,0,0,1];
    },

    // Rotation by angle (radians) around the given axis [x, y, z]
    axisRotation: function (axis, angle) {
        let x = axis[0], y = axis[1], z = axis[2];
        const n = Math.sqrt(x * x + y * y + z * z);
        x /= n; y /= n; z /= n;
        const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
        return [
            t*x*x + c,     t*x*y + s*z,   t*x*z - s*y,   0,
            t*x*y - s*z,   t*y*y + c,     t*y*z + s*x,   0,
            t*x*z + s*y,   t*y*z - s*x,   t*z*z + c,     0,
            0, 0, 0, 1
        ];
    },

    xRotation: function (a) { return m4.axisRotation([1,0,0], a); },
    yRotation: function (a) { return m4.axisRotation([0,1,0], a); },
    zRotation: function (a) { return m4.axisRotation([0,0,1], a); },

    perspective: function (fieldOfViewInRadians, aspect, near, far) {
        const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
        const rangeInv = 1.0 / (near - far);
        return [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0
        ];
    },

    orthographic: function (left, right, bottom, top, near, far) {
        return [
            2 / (right - left), 0, 0, 0,
            0, 2 / (top - bottom), 0, 0,
            0, 0, 2 / (near - far), 0,
            (left + right) / (left - right),
            (bottom + top) / (bottom - top),
            (near + far) / (near - far),
            1
        ];
    }
};