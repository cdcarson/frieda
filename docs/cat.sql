CREATE TABLE `CatPerson` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `Cat` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ownerId` bigint unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(350) NOT NULL,
  `lastSeen` json,
  `shortDescription` varchar(320),
  `longDescription` text INVISIBLE,
  `fleaCount` bigint NOT NULL DEFAULT(0),
  `height` double NOT NULL,
  `length` double NOT NULL,
  `breadth` double NOT NULL,
  `volume` double GENERATED ALWAYS AS (`height` * `length` * `breadth`) STORED NOT NULL
  PRIMARY KEY (`id`),
  UNIQUE KEY `CatEmail` (`email`)
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

ALTER TABLE
  CompanyStripeAccount
MODIFY
  COLUMN ` stripeAccount ` json NOT NULL COMMENT '@json(import(''stripe'').Stripe.Account)';

ALTER TABLE
  PricingPlan
MODIFY
  COLUMN ` discounts ` json NOT NULL COMMENT '@json(import(''../types.js'').DiscountTier)';