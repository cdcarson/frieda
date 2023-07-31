CREATE TABLE `Triangle` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `url` varchar(300) NOT NULL,
  `description` text INVISIBLE,
  `a` double NOT NULL,
  `b` double NOT NULL,
  `c` double GENERATED ALWAYS AS (sqrt(((`a` * `b`) + (`a` * `b`)))) STORED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `triangle_url` (`url`)
);


CREATE TABLE `UserAccount` (
  `userId` bigint unsigned NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `lastSignedInAt` datetime(3) NOT NULL,
  `email` varchar(320) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
  /*!80023 INVISIBLE */
,
  `emailVerified` tinyint(1) NOT NULL,
  PRIMARY KEY (`userId`),
  UNIQUE KEY `UserAccount_email_key` (`email`),
  KEY `UserAccount_userId_idx` (`userId`),
  FULLTEXT KEY `UserAccount_email_idx` (`email`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci