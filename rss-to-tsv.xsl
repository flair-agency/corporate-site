<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:media="http://search.yahoo.com/mrss/"
  exclude-result-prefixes="media"
>
  <xsl:output method="text" encoding="UTF-8"/>

  <xsl:template match="/rss/channel">
    <xsl:for-each select="item">
      <xsl:value-of select="normalize-space(title)"/>
      <xsl:text>&#9;</xsl:text>

      <xsl:value-of select="normalize-space(link)"/>
      <xsl:text>&#9;</xsl:text>

      <xsl:value-of select="normalize-space(pubDate)"/>
      <xsl:text>&#9;</xsl:text>

      <xsl:value-of select="normalize-space(description)"/>
      <xsl:text>&#9;</xsl:text>

      <xsl:value-of select="normalize-space(media:thumbnail)"/>
      <xsl:text>&#10;</xsl:text>
    </xsl:for-each>
  </xsl:template>
</xsl:stylesheet>