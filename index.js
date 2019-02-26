class Canvas {
  constructor(el) {
    this.el = el;
    this.width = el.width;
    this.height = el.height;

    this.ctx = el.getContext('2d');
    this.image = this.ctx.getImageData(0, 0, this.width, this.height);
  }

  setPixel(x, y, color) {
    let i = 4 * (y * this.width + x);
    this.image.data[i++] = color[0];
    this.image.data[i++] = color[1];
    this.image.data[i++] = color[2];
    this.image.data[i] = 255;
  }

  render() {
    this.ctx.putImageData(this.image, 0, 0);
  }
}

class Vec {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize() {
    const length = this.length();
    return new Vec(
      this.x / length,
      this.y / length,
      this.z / length,
    );
  }

  subtract(other) {
    return new Vec(
      this.x - other.x,
      this.y - other.y,
      this.z - other.z,
    );
  }

  dot(other) {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }
}

class Film {
  constructor(topLeft, bottomRight) {
    this.topLeft = topLeft;
    this.width = bottomRight.x - topLeft.x;
    this.height = topLeft.y - bottomRight.y;
    this.z = topLeft.z;
  }

  project(x, y) {
    return new Vec(
      this.topLeft.x + (x * this.width),
      this.topLeft.y - (y * this.height),
      this.z,
    );
  }
}

class Camera {
  constructor(eye, film) {
    this.eye = eye;
    this.film = film;
  }

  trace(x, y) {
    const direction = this.film.project(x, y);
    return new Ray(this.eye, direction);
  }
}

class Ray {
  constructor(origin, direction) {
    this.origin = origin;
    this.direction = direction;
  }
}

const sqr = n => n * n;

class Sphere {
  constructor(center, radius, color) {
    this.center = center;
    this.radius = radius;
    this.color = color;
  }

  intersect(ray) {
    const oc = ray.origin.subtract(this.center);
    const dot = ray.direction.normalize().dot(oc);

    const a = sqr(dot);
    const b = sqr(oc.length()) - sqr(this.radius);

    if (a < b) {
      return null;
    }

    const sqrt = Math.sqrt(a - b);
    const ts = [
      -dot - sqrt,
      -dot + sqrt,
    ].filter(t => t >= 0);

    if (ts.length > 0) {
      return ts[0];
    } else {
      return null;
    }
  }
}

(function() {
  const canvas = new Canvas(document.getElementById('canvas'));

  const eye = new Vec(0, 0, 0);
  const film = new Film(new Vec(-1, 1.5, 1), new Vec(1, 0, 1));
  const camera = new Camera(eye, film);
  const spheres = [
    new Sphere(new Vec(0, 1, 5), 1, [255, 0, 150]),
    new Sphere(new Vec(1, 1, 5), 1, [0, 255, 0]),
    new Sphere(new Vec(2, 1, 5), 1, [0, 0, 255]),
  ];

  const render = () => {
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const ray = camera.trace(x / canvas.width, y / canvas.height);

        let min = { t: Infinity, sphere: null };

        for (let sphere of spheres) {
          const t = sphere.intersect(ray);
          if (t !== null && t < min.t) {
            min = { t, sphere };
          }
        }

        const { sphere } = min;
        if (sphere) {
          canvas.setPixel(x, y, sphere.color);
        } else {
          canvas.setPixel(x, y, [0, 0, 0]);
        }
      }
    }

    canvas.render();
  }

  render();

  document.addEventListener('keydown', e => {
    switch (e.key) {
      case 'a':
      case 'h':
        eye.x -= 0.1;
        film.topLeft.x -= 0.1;
        break;
      case 'j':
        eye.y -= 0.1;
        film.topLeft.y -= 0.1;
        break;
      case 'k':
        eye.y += 0.1;
        film.topLeft.y += 0.1;
        break;
      case 'd':
      case 'l':
        eye.x += 0.1;
        film.topLeft.x += 0.1;
        break;
      case 'w':
        eye.z += 0.1;
        film.z += 0.1;
        break;
      case 's':
        eye.z -= 0.1;
        film.z -= 0.1;
        break;
      default:
        return;
    }

    render();
    e.preventDefault();
  });
})();
