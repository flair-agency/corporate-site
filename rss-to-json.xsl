<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
    version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:media="http://search.yahoo.com/mrss/"
    exclude-result-prefixes="media">

  <xsl:output method="text" encoding="UTF-8"/>

  <!-- JSON string escaping for XML 1.0 text. -->
  <xsl:template name="json-escape">
    <xsl:param name="text"/>
    <xsl:if test="string-length($text) &gt; 0">
      <xsl:variable name="c" select="substring($text, 1, 1)"/>
      <xsl:choose>
        <xsl:when test="$c = '&quot;'">
          <xsl:text>\&quot;</xsl:text>
        </xsl:when>
        <xsl:when test="$c = '\'">
          <xsl:text>\\</xsl:text>
        </xsl:when>
        <xsl:when test="$c = '&#xA;'">
          <xsl:text>\n</xsl:text>
        </xsl:when>
        <xsl:when test="$c = '&#xD;'">
          <xsl:text>\r</xsl:text>
        </xsl:when>
        <xsl:when test="$c = '&#x9;'">
          <xsl:text>\t</xsl:text>
        </xsl:when>
        <xsl:otherwise>
          <xsl:value-of select="$c"/>
        </xsl:otherwise>
      </xsl:choose>
      <xsl:call-template name="json-escape">
        <xsl:with-param name="text" select="substring($text, 2)"/>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>

  <!-- description is HTML stored as CDATA/text, not XML child nodes. -->
  <xsl:template name="strip-html">
    <xsl:param name="text"/>
    <xsl:choose>
      <xsl:when test="contains($text, '&lt;')">
        <xsl:value-of select="substring-before($text, '&lt;')"/>
        <xsl:variable name="after-open" select="substring-after($text, '&lt;')"/>
        <xsl:choose>
          <xsl:when test="contains($after-open, '&gt;')">
            <xsl:call-template name="strip-html">
              <xsl:with-param name="text" select="substring-after($after-open, '&gt;')"/>
            </xsl:call-template>
          </xsl:when>
          <xsl:otherwise>
            <xsl:text>&lt;</xsl:text>
            <xsl:value-of select="$after-open"/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$text"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="without-read-more">
    <xsl:param name="text"/>
    <xsl:variable name="suffix" select="'続きをみる'"/>
    <xsl:choose>
      <xsl:when test="substring($text, string-length($text) - string-length($suffix) + 1) = $suffix">
        <xsl:value-of select="normalize-space(substring($text, 1, string-length($text) - string-length($suffix)))"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$text"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="month-number">
    <xsl:param name="month"/>
    <xsl:choose>
      <xsl:when test="$month = 'Jan'">01</xsl:when>
      <xsl:when test="$month = 'Feb'">02</xsl:when>
      <xsl:when test="$month = 'Mar'">03</xsl:when>
      <xsl:when test="$month = 'Apr'">04</xsl:when>
      <xsl:when test="$month = 'May'">05</xsl:when>
      <xsl:when test="$month = 'Jun'">06</xsl:when>
      <xsl:when test="$month = 'Jul'">07</xsl:when>
      <xsl:when test="$month = 'Aug'">08</xsl:when>
      <xsl:when test="$month = 'Sep'">09</xsl:when>
      <xsl:when test="$month = 'Oct'">10</xsl:when>
      <xsl:when test="$month = 'Nov'">11</xsl:when>
      <xsl:when test="$month = 'Dec'">12</xsl:when>
    </xsl:choose>
  </xsl:template>

  <!-- Convert an RFC 822 date used by RSS to ISO 8601 while preserving
       the original numeric UTC offset.
       Example: Sun, 24 May 2026 13:48:36 +0900
             -> 2026-05-24T13:48:36+09:00 -->
  <xsl:template name="rfc822-to-iso8601">
    <xsl:param name="value"/>

    <xsl:variable name="day" select="substring($value, 6, 2)"/>
    <xsl:variable name="month-name" select="substring($value, 9, 3)"/>
    <xsl:variable name="year" select="substring($value, 13, 4)"/>
    <xsl:variable name="time" select="substring($value, 18, 8)"/>
    <xsl:variable name="tz" select="substring($value, 27, 5)"/>

    <xsl:variable name="month">
      <xsl:call-template name="month-number">
        <xsl:with-param name="month" select="$month-name"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:value-of select="concat(
      $year, '-', string($month), '-', $day,
      'T', $time,
      substring($tz, 1, 3), ':', substring($tz, 4, 2)
    )"/>
  </xsl:template>

  <xsl:template match="/">
    <xsl:text>{&#10;  "title": "</xsl:text>
    <xsl:call-template name="json-escape">
      <xsl:with-param name="text" select="string(rss/channel/title)"/>
    </xsl:call-template>
    <xsl:text>",&#10;  "url": "</xsl:text>
    <xsl:call-template name="json-escape">
      <xsl:with-param name="text" select="string(rss/channel/link)"/>
    </xsl:call-template>
    <xsl:text>",&#10;  "description": "</xsl:text>
    <xsl:call-template name="json-escape">
      <xsl:with-param name="text" select="string(rss/channel/description)"/>
    </xsl:call-template>
    <xsl:text>",&#10;  "lastBuildDate": "</xsl:text>
    <xsl:call-template name="rfc822-to-iso8601">
      <xsl:with-param name="value" select="string(rss/channel/lastBuildDate)"/>
    </xsl:call-template>
    <xsl:text>",&#10;  "articles": [</xsl:text>

    <xsl:for-each select="rss/channel/item">
      <xsl:if test="position() &gt; 1">
        <xsl:text>,</xsl:text>
      </xsl:if>
      <xsl:text>&#10;    {&#10;      "title": "</xsl:text>

      <xsl:variable name="plain-description-raw">
        <xsl:call-template name="strip-html">
          <xsl:with-param name="text" select="string(description)"/>
        </xsl:call-template>
      </xsl:variable>
      <xsl:variable name="plain-description" select="normalize-space(string($plain-description-raw))"/>
      <xsl:variable name="description-without-read-more">
        <xsl:call-template name="without-read-more">
          <xsl:with-param name="text" select="$plain-description"/>
        </xsl:call-template>
      </xsl:variable>

      <xsl:call-template name="json-escape">
        <xsl:with-param name="text" select="string(title)"/>
      </xsl:call-template>
      <xsl:text>",&#10;      "url": "</xsl:text>
      <xsl:call-template name="json-escape">
        <xsl:with-param name="text" select="string(link)"/>
      </xsl:call-template>
      <xsl:text>",&#10;      "thumbnail": "</xsl:text>
      <xsl:call-template name="json-escape">
        <xsl:with-param name="text" select="string(media:thumbnail)"/>
      </xsl:call-template>
      <xsl:text>",&#10;      "publishedAt": "</xsl:text>
      <xsl:call-template name="rfc822-to-iso8601">
        <xsl:with-param name="value" select="string(pubDate)"/>
      </xsl:call-template>
      <xsl:text>",&#10;      "description": "</xsl:text>
      <xsl:call-template name="json-escape">
        <xsl:with-param name="text" select="string($description-without-read-more)"/>
      </xsl:call-template>
      <xsl:text>"&#10;    }</xsl:text>
    </xsl:for-each>

    <xsl:text>&#10;  ]&#10;}&#10;</xsl:text>
  </xsl:template>

</xsl:stylesheet>
