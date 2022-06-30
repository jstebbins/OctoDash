#! /usr/bin/env python

"""
svg2fa

Converts a collection of SVG vector images to an icon set suitable
for inclusion in an angular app using FontAwesomeModule. Generates
<out>.js and <out>.d.ts files required for importing and loading with
FaIconLibrary.addIconPacks().

Converts <path>, <ellipse>, <circle>, <rect>, and <polygon> elements.

Limitations:
    FA treats all paths as fill style
    Does not convert bitmap data embedded in SVGs.
    Does not convert <polyline> elements
    Does not honor transforms
    Does not honor attributes fill, stroke, stroke-width

Notes:

FA icons do not retain the style elements of the SVG. All paths are
filled. FA rendering seems to invert any intersecting regions of filled
paths (although this "rule" is a little fuzzy, other factors that I have't
figured out seem to affect the outcome).

OctoDash SVGs are all styled using the "style" attribute where it matters.
So I did not add processing of "fill", "stroke", or "stroke-width" attributes
since it was not required and I could not test.

This script converts strokes to paths when fill style is none for ellipse,
circle, and rect. I have not written code to fill stroked polygon or
path elements as this is hard and not required for OctoDash SVG set.

I have not implemented transforms.  Also a harder task. It is easier
to just edit the SVG to remove the transforms.
"""

import os
import sys
import getopt
from xml.dom import minidom

usage_msg = """"Usage:
svg2fa -h -d -o <dst> -p <prefix> -u <hex> <svg> [<svg> ...]
    -h --help       - show this message
    -o --outpus     - Basename for JavaScript and TypeScript output files
    -p --prefix     - prefix by which this FA icon set will be referenced
    -u --unicode    - Hex value for initial unicode char to be used by
                      the icon set
    -d --debug      - Writes modified SVG for inspection
"""

def usage():
    print("%s" %usage_msg)

"""
All the information required to create an entry in a FontAwesome icon set
"""
class FAIcon:
    def __init__(self, prefix, name, width, height, path):
        self.iconName = name
        self.name = "%s%s" % (prefix, name.capitalize())
        self.width = width
        self.height = height
        self.path = path

"""
Parse and transform SVG elements into a single path element suitable for use
in a FontAwesome icon
"""
class SVG:
    top_svg = """
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="0 0 %s %s" style="enable-background:new 0 0 100 100;" xml:space="preserve"><g>"""

    name = ""
    path = ""
    width = 0;
    height = 0;

    def __init__(self, name):
        self.name = name

    """
    Write the collected elements back to an SVG that is styled in a way
    to assist in evaluating what the FA icons appearance will be.
    """
    def write(self, fa):
        f = open(fa.iconName + "_debug.svg", "w")
        print(self.top_svg % (fa.width, fa.height), file=f)
        print('<path d="%s" style="fill: white"/>' % fa.path, file=f)
        print('</g></svg>', file=f)

    def rect(self, w, h, close, width):
        # If the path needs closing, create one continuous
        # path composed of an outer rectangle of:
        #   (width + stroke_width, height + stroke_width)
        # and an inner rectangle of:
        #   (width - stroke_width, height - stroke_width)
        p = "l %s,%s %s,%s %s,%s " % (w, 0, 0, h, -w, 0)

        if (close):
            p += "%s,%s " % (0, -h)
            w -= width
            h -= width
            p += "%s,%s " % (width, width)
            p += "%s,%s %s,%s %s,%s %s,%s" % (0, h, w, 0, 0, -h, -w, 0)
        p += " Z"

        return p

    def polygon(self, points):
        values = points.replace(",", " ").split()
        x = values[0]
        y = values[1]
        # Initial position and start lineto
        p = "M %s,%s L " % (x, y)
        for c in range(2, len(values) - 1, 2):
            x = values[c]
            y = values[c + 1]
            p += "%s,%s " % (x, y)
        p += " Z"
        return p

    def ellipse2bezier(self, cx, cy, rx, ry, close, width):
        # If the path needs closing, create one continuous
        # path composed of an outer ellipse with of:
        #   radius + stroke_width / 2
        # and an inner ellipse of:
        #   radius - stroke_width / 2.
        if (close):
            rx += width / 2
            ry += width / 2

        w23 = rx * 4 / 3
        h = ry * 2

        # Initial position
        p = "M %s,%s " % (cx, cy - ry)

        # Right side arc
        p += "c %s,%s %s,%s %s,%s " % ( w23, 0,  w23,  h, 0,  h)
        # Left side arc
        p += "c %s,%s %s,%s %s,%s " % (-w23, 0, -w23, -h, 0, -h)

        if (close):
            rx -= width
            ry -= width
            w23 = rx * 4 / 3
            h = ry * 2

            p += "l %s,%s " % (0, width)
            # Left side inner arc
            p += "c %s,%s %s,%s %s,%s " % (-w23, 0, -w23,  h, 0,  h)
            # Right side inner arc
            p += "c %s,%s %s,%s %s,%s " % ( w23, 0,  w23, -h, 0, -h)
            #p = "l %s,%s " % (0, -width)

        # Close
        p += " Z"
        return p

    def parseStyle(self, styles):
        parts = styles.split(';')
        fill = True
        stroke = False
        stroke_width = 0
        for part in parts:
            if ("fill:" in part):
                if ("none" in part):
                    fill = False
            if ("stroke-width:" in part):
                stroke_width = float(part.split(':')[1].replace('px', ''))
            if ("stroke:" in part):
                if ("none" not in part):
                    stroke = True

        return (fill, stroke, stroke_width)

    def rec_parse(self, node):
        p = ""
        if (node.nodeType == 1):
            if (node.tagName == "svg"):
                print("    svg")
                w = node.getAttribute('width')
                h = node.getAttribute('height')
                vb = node.getAttribute('viewBox');
                v = vb.split()
                if not w:
                    w = v[2]
                if not h:
                    h = v[3]
                self.width = w
                self.height = h
            if (node.tagName == "path"):
                print("    path")
                style = node.getAttribute('style')
                (fill, stroke, swidth) = self.parseStyle(style)
                if (fill or stroke):
                    d = node.getAttribute('d')
                    if (d[0] == 'm'):
                        d = 'M' + d[1:]
                    p += d
                else:
                    print("%s: discarding path with no fill and black stroke" % name);
            elif (node.tagName == "ellipse"):
                print("    ellipse")
                style = node.getAttribute('style')
                (fill, stroke, swidth) = self.parseStyle(style)
                if (fill or stroke):
                    cx = float(node.getAttribute('cx'))
                    cy = float(node.getAttribute('cy'))
                    rx = float(node.getAttribute('rx'))
                    ry = float(node.getAttribute('ry'))
                    p += self.ellipse2bezier(cx, cy, rx, ry, not fill, swidth)
                else:
                    print("%s: discarding ellipse with no fill and black stroke" % name);
            elif (node.tagName == "circle"):
                print("    circle")
                style = node.getAttribute('style')
                (fill, stroke, swidth) = self.parseStyle(style)
                if (fill or stroke):
                    cx = float(node.getAttribute('cx'))
                    cy = float(node.getAttribute('cy'))
                    r = float(node.getAttribute('r'))
                    p += self.ellipse2bezier(cx, cy, r, r, not fill, swidth)
                else:
                    print("%s: discarding circle with no fill and black stroke" % name);
            elif (node.tagName == "polygon"):
                print("    polygon")
                style = node.getAttribute('style')
                (fill, stroke, swidth) = self.parseStyle(style)
                if (fill or stroke):
                    points = node.getAttribute('points')
                    p += self.polygon(points)
                else:
                    print("%s: discarding polygon with no fill and black stroke" % name);
            elif (node.tagName == "rect"):
                print("    rect")
                style = node.getAttribute('style')
                (fill, stroke, swidth) = self.parseStyle(style)
                if (fill or stroke):
                    xs = node.getAttribute('x')
                    ys = node.getAttribute('y')
                    width = float(node.getAttribute('width'))
                    height = float(node.getAttribute('height'))
                    if xs and ys:
                        p = "M %s,%s " % (xs, ys)
                    p += self.rect(width, height, not fill, swidth)
                else:
                    print("%s: discarding polygon with no fill and black stroke" % name);

        self.path += p

        for child in node.childNodes:
            self.rec_parse(child)

    def parse(self, file):
        print("Parsing: %s" % self.name)
        doc = minidom.parse(file)
        svg = doc.getElementsByTagName('svg')[0]
        self.rec_parse(svg)

"""
Write <out>.js and <out>.d.ts FontAwesome icon set files
"""
class IconSet:
    top_js = """(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global['octodash-svg-icons'] = {})));
}(this, (function (exports) { 'use strict';

"""

    bottom_js = """
Object.defineProperty(exports, '__esModule', { value: true });

})));
"""

    top_ts = """import { IconDefinition, IconPack, IconPrefix } from '@fortawesome/fontawesome-common-types';

export { IconDefinition, IconPack, IconPrefix } from '@fortawesome/fontawesome-common-types';"""

    bottom_ts = """export const prefix: IconPrefix;"""

    def __init__(self, faList, prefix, unicode):
        self.faList = faList
        self.prefix = prefix
        self.unicode = unicode

    def write_js(self, dst):
        f = open(dst, "w")
        print('%s' % self.top_js, file=f)
        print('  var prefix = "%s";' % self.prefix, file=f)
        unicode = self.unicode
        for fa in self.faList:
            print('  var %s = {' % fa.name, file=f)
            print("    prefix: '%s'," % self.prefix, file=f)
            print("    iconName: '%s'," % fa.iconName, file=f)
            print('    icon: [%s, %s, [], "%0.4x", "%s"]' %
                  (fa.width, fa.height, unicode, fa.path), file=f)
            print('  };', file=f)
            unicode += 1

        print('  var _iconsCache = {', file=f)
        for fa in self.faList:
            print('    %s: %s,' % (fa.name, fa.name), file=f)
        print('  };', file=f)
        print('  exports.%s = _iconsCache;' % self.prefix, file=f)
        print('  exports.prefix = prefix;', file=f)
        for fa in self.faList:
            print('  exports.%s = %s;' % (fa.name, fa.name), file=f)
        print('%s' %self.bottom_js, file=f)

    def write_ts(self, dst):
        f = open(dst, "w")
        print('%s' %self.top_ts, file=f)
        for fa in self.faList:
            print('export const %s: IconDefinition;' % fa.name, file=f)
        print('%s' %self.bottom_ts, file=f)
        print('export const %s: IconPack;' % self.prefix, file=f)

    def write(self, dst):
        self.write_js(dst + '.js')
        self.write_ts(dst + '.d.ts')

if __name__ == "__main__":
    try:
        opts, args = getopt.getopt(sys.argv[1:], "hdo:p:u:",
            ["help", "debug", "output=", "prefix=", "unicode="])
    except getopt.GetoptError:
        usage()
        sys.exit(2)

    dst = ""
    prefix = ""
    unicode = "d100"
    debug = False
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            usage()
            sys.exit()
        elif opt in ("-d", "--debug"):
            debug = True
        elif opt in ("-o", "--outpus"):
            dst = arg
        elif opt in ("-p", "--prefix"):
            prefix = arg
        elif opt in ("-u", "--unicode"):
            unicode = arg
    unicode = int(unicode, 16)

    faList = []
    if (len(args) == 0):
        usage();

    # Process SVG files and create a list of FontAwesome icons
    # for the icon set
    for file in args:
        name = os.path.splitext(os.path.basename(file))[0].replace('-', '')
        svg = SVG(name)
        svg.parse(file)
        faIcon = FAIcon(prefix, name, svg.width, svg.height, svg.path)
        faList.append(faIcon)
        if (debug):
            svg.write(faIcon)

    # Write the FontAwesome icon set
    if (dst and prefix):
        iconSet = IconSet(faList, prefix, unicode)
        iconSet.write(dst)
