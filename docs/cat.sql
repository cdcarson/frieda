CREATE TABLE `CatPerson` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE Cat (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ownerId` bigint unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `fleaCount` bigint DEFAULT 0,
  PRIMARY KEY (`id`)
)
SELECT
  CatPerson.id AS catPersonId,
  COALESCE(CatStats.catCount, 0) AS catCount,
  COALESCE(CatStats.fleaCount, 0) AS fleaCount
FROM
  CatPerson
  LEFT JOIN (
    SELECT
      Cat.ownerId AS ownerId,
      COUNT(*) AS catCount,
      SUM(Cat.fleaCount) AS fleaCount
    FROM
      Cat
    GROUP BY
      Cat.ownerId
  ) AS CatStats ON CatStats.ownerId = CatPerson.id;