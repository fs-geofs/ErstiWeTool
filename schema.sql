-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='TRADITIONAL,ALLOW_INVALID_DATES';

-- -----------------------------------------------------
-- Schema ersti-we
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `ersti-we` DEFAULT CHARACTER SET utf8 ;
USE `ersti-we` ;

-- -----------------------------------------------------
-- Table `ersti-we`.`users`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `ersti-we`.`users` ;

CREATE TABLE IF NOT EXISTS `ersti-we`.`users` (
  `token` CHAR(8) NOT NULL,      -- registration token
  `matrikel` CHAR(6) NULL,
  `firstname` VARCHAR(50) NULL,
  `lastname` VARCHAR(50) NULL,
  `gender` ENUM('male', 'female', 'other') NULL,
  `email` VARCHAR(50) NULL,
  `phone` VARCHAR(50) NULL,
  `comment` VARCHAR(500) NULL,
  `birthday` VARCHAR(50) NULL,
  `food` ENUM('fleischig', 'vegan', 'vegetarisch') NULL,
  `drinks` ENUM('alcoholic', 'non-alcoholic') NULL,
  `study` ENUM('Geoinformatik', 'Geographie', 'Landschaftsökologie', 'Zwei-Fach-Bachelor') NULL,
  `year` INT NOT NULL, -- assigned year of the user
  `state` ENUM('free', 'registered', 'opted_out') NOT NULL DEFAULT 'free', -- flag, whether a token is used or not
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- date of registration
  `prev_user` CHAR(8) NULL, -- references the the user previous user of the spot (for waitlist registrations)
  `dsgvo` TIMESTAMP NULL,
  PRIMARY KEY (`token`, `year`),
  FOREIGN KEY (`prev_user`) REFERENCES users(`token`)
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `ersti-we`.`waitlist`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `ersti-we`.`waitlist` ;

CREATE TABLE IF NOT EXISTS `ersti-we`.`waitlist` (
  `email` VARCHAR(50) NOT NULL,
  `year` INT NOT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`email`, `year`))
ENGINE = InnoDB;

-- -----------------------------------------------------
-- Triggers
-- -----------------------------------------------------
DROP TRIGGER IF EXISTS `registerUser`;

DELIMITER |
CREATE TRIGGER `registerUser` BEFORE UPDATE ON `users`
  FOR EACH ROW BEGIN
    IF (NEW.state = 'registered') THEN
      SET NEW.timestamp = CURRENT_TIMESTAMP;
      DELETE FROM waitlist WHERE email=NEW.email AND year=NEW.year;
    END IF;
  END;
|
DELIMITER ;

-- Compatibility to mysql < 5.6.*, replacing
-- CREATE USER IF NOT EXISTS `ersti-we`;
CREATE USER `ersti-we`;
GRANT ALL PRIVILEGES ON `ersti-we`.* TO `ersti-we`;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
